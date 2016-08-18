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
var passport = require('passport');
var Strategy = require('passport-openidconnect').Strategy;

var defaultRequest = request.defaults({baseUrl: config.backend});

passport.use(new Strategy(config.oidc,
  function(token, tokenSecret, profile, cb) {
    // In this example, the user's Twitter profile is supplied as the user
    // record.  In a production-quality application, the Twitter profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    new Promise(function(resolve, reject) {
      defaultRequest('/schema?objName=UserInterface', function(error, response, body) {
        if(error) return reject(error);

        try {
          var ui = JSON.parse(body)[0];
        } catch(error) {
          return reject(error);
        }
        resolve(ui);
      });
    })
    .then(function(ui) {
      return new Promise(function(resolve, reject) {
        defaultRequest('/?objInterface='+ui._id+'&externalId='+profile.id, function(error, response, body) {
          if(error) return reject(error);
          try {
            var user = JSON.parse(body)[0];
          } catch(error) {
            return reject(error);
          }
          resolve(user);
        })
      });

    })
    .then(function(user) {
      cb(null, user, profile);
    })
    .catch(function(err) {
      cb(err, false, profile);
    });
  }));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

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
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.use('/scripts', express.static(path.join(__dirname, 'app/scripts')));
app.use('/views', express.static(path.join(__dirname, 'app/views')));
app.use(passport.initialize());
app.use(passport.session());
app.get('/oidc/callback', function(req, res, next) {
  passport.authenticate('openidconnect', {callbackURL: "/oidc/callback"}, function(err, user, info) {
    if(err) return res.status(500).send(err);
    if(!user) {
      req.session.user='anonymous';
      req.session.profile=info._json;
      return res.redirect('/#/notUser');
    }
    req.session.user = user._id;
    res.redirect('/');
  })(req, res, next);
});
app.use(function(req, res, next) {
  if(!req.session.user) {
    return res.redirect('/oidc/callback');
  }
  next();
}, express.static(path.join(__dirname, 'app')));


app.use(function(req, res, next) {
  console.log(req.method+' '+req.originalUrl+' %j', req.body);
  next();
});

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
          if(/application\/json/.test(response.headers['content-type']) && typeof body == 'string') {
            body = JSON.parse(body);
          }
          resolve(body);
        } catch(e) {
          reject(e);
        }
      });
    })
    .nodeify(cb);
  };

  socket.on('nouser:profile', function(cb) {
    cb(socket.request.session.profile);
  });

  socket.on('nouser:create', function(cb) {
    if(!socket.request.session.profile) return cb('No profile found.')
    var options = {
      url: config.oidc.tokenURL,
      method: 'POST',
      headers: {
        authorization: 'Basic '+(new Buffer(config.oidc.clientID+':'+config.oidc.clientSecret).toString('base64'))
      },
      json: {
        grant_type: 'client_credentials'
      }
    }
    request(options, function(error, response, body) {
      if(!body||!body.access_token) {
        return cb('Could not get access token.');
      }
      var options = {
        url: '/schema',
        qs: {
          objName: 'UserInterface'
        },
        method: 'GET'
      };
      bkRequest(options)
      .then(function(ui) {
        if(!ui[0]) return cb('Could not get UserInterface.');
        var options = {
          url: '/',
          method: 'POST',
          json: {
            objInterface: [ui[0]._id],
            objName: socket.request.session.profile.name.toUpperCase(),
            user: {
              externalId: [socket.request.session.profile.sub]
            }
          },
          headers: {
            authorization: 'Bearer '+body.access_token
          }
        };
        bkRequest(options, cb);
      })
    })
  })

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
