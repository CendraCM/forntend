var express=require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var parser = require('body-parser');
var session = require('express-session');
var request = require('request');
var config = require('/etc/service-config/service');
var path = require('path');
var fs = require('fs');
var extend = require('extend');
var RedisStore = require('connect-redis')(session);
var Promise = require('promise');

app.get('/test', function(req, res, next) {
  res.send('Ok');
});

var sessionConfig = {resave: false, saveUninitialized: false, secret: 'fasñdlfkj2i34u21834udf8u]!!'};
if(config.redis) {
  sessionConfig.store = new RedisStore(config.redis);
}
var sessionMiddleware = session(sessionConfig);
app.use(sessionMiddleware);
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'app')));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));

app.use(function(req, res, next) {
  console.log(req.method+' '+req.originalUrl+' %j', req.body);
  next();
});
var defaultRequest = request.defaults({baseUrl: config.backend});
app.use('/backend', function(req, res, next) {
  console.log('%j', config);
  var headers = extend({}, req.headers);
  delete headers.host;
  var options = {
    url: req.url,
    method: req.method,
    headers: headers
  };
  if(["POST", "PUT", "PATCH"].indexOf(req.method) !== -1) {
    options.json = req.body||'';
  }
  console.log('%j', options);
  defaultRequest(options, function(error, response, body) {
    if(error) return res.status(500).send(error);
    res.set(response.headers);
    res.status(response.statusCode).send(body);
  });
});

io.use(function(socket, next) {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', function(socket) {
  var user = null;
  var queue = null;

  if(config.redis) queue = require('redis-event-queue')(config.redis).broadcast;

  var setListeners = function() {
    if(!queue) return;
    queue.removeAllListeners();
    if(!user) return;
    new Promise(function(resolve, reject) {
      var options = {
        url: '/schema',
        qs: {
          objName: 'GroupInterface'
        },
        method: 'GET'
      };
      defaultRequest(options, function(error, response, body){
        if(error) return reject(error);
        if(response.statusCode !== 200) return reject(body);
        try {
          resolve(JSON.parse(body)[0]._id);
        } catch(e) {
          reject(e);
        }
      });
    })
    .then(function(schemaId) {
      return new Promise(function(resolve, reject) {
        var options = {
          url: '/',
          qs: {
            objInterface: schemaId,
            objLinks: user._id
          },
          method: 'GET'
        };
        defaultRequest(options, function(error, response, body){
          if(error) return reject(error);
          if(response.statusCode !== 200) return reject(body);
          try {
            resolve(JSON.parse(body));
          } catch(e) {
            reject(e);
          }
        });
      });
    })
    .then(function(groups) {
      groups.forEach(function(group) {
        var prefix = group.rootGroup?'root':group._id;
        queue.on(prefix+':insert:document', function(doc) {
          socket.emit('document:inserted', doc);
        });
        queue.on(prefix+':update:document', function(doc) {
          socket.emit('document:updated', doc);
        });
        queue.on(prefix+':delete:document', function(doc) {
          socket.emit('document:deleted', doc);
        });
      });
    });
  };

  var isLoggedIn = function() {
    if(user && user === socket.request.session.user) return true;
    user = socket.request.session.user;
    if(user) setListeners();
    return !!user;
  };

  isLoggedIn();

  var bkRequest = function(options, cb) {
    return new Promise(function(resolve, reject) {
      defaultRequest(options, function(error, response, body){
        if(error) return reject(error);
        if(response.statusCode >= 400) return reject(body);
        try {
          resolve(body);
        } catch(e) {
          reject(e);
        }
      });
    })
    .nodeify(cb);
  };

  socket.on('insert:document', function(doc, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/',
      json: doc,
      method: 'POST'
    };
    bkRequest(options, cb);
  });

  socket.on('update:document', function(id, doc, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/'+id,
      json: doc,
      method: 'PUT'
    };
    bkRequest(options, cb);
  });

  socket.on('delete:document', function(id, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/'+id,
      method: 'DELETE'
    };
    bkRequest(options, cb);
  });

  socket.on('list:document', function(filter, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/',
      qs: filter,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('get:document', function(id, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/'+id,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('list:schema', function(filter, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/schema',
      qs: filter,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('get:schema', function(id, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/schema/'+id,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('insert:schema', function(sch, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/schema',
      json: sch,
      method: 'POST'
    };
    bkRequest(options, cb);
  });

});

server.listen(80);
