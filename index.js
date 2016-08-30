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
var issuer = require('openid-client').Issuer;
var yuliIssuer = new issuer(config.issuer);
var oidc = new yuliIssuer.Client(config.creds);

var defaultRequest = request.defaults({baseUrl: config.backend});
var interfaces = {};

app.get('/test', function(req, res, next) {
  res.send('Ok');
});

var sessionConfig = {resave: false, saveUninitialized: false, secret: 'fasñdlfkj2i34u21834udf8u]!!'};
if(config.redis) {
  sessionConfig.store = new RedisStore(config.redis);
}


function getInterface(req, name) {
  var query = '';
  if(!req.session.interfaces) req.session.interfaces = {};
  if(name) {
    if(req.session.interfaces[name]) return Promise.resolve(req.session.interfaces[name]);
    query = '?objName='+name;
  }
  return new Promise(function(resolve, reject) {
    defaultRequest('/schema'+query, function(error, response, body) {
      if(error) return reject(error);
      var uis = [];
      try {
        uis = JSON.parse(body);
      } catch(error) {
        return reject(error);
      }
      for(var i in uis) {
        req.session.interfaces[uis[i].objName] = uis[i];
      }
      req.session.save();
      if(name) {
        return req.session.interfaces[name]?resolve(req.session.interfaces[name]):reject('interface with name '+name+' not found.');
      }
      resolve(ui);
    });
  });
}

var sessionMiddleware = session(sessionConfig);
app.use(sessionMiddleware);
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.use('/scripts', express.static(path.join(__dirname, 'app/scripts')));
app.use('/views', express.static(path.join(__dirname, 'app/views')));
app.get('/oidc/callback', function(req, res, next) {
  Promise.all([
    oidc.authorizationCallback(req.protocol+'://'+req.headers.host+'/oidc/callback', req.query)
    .then(function(tokenSet) {
      req.session.tokenSet = tokenSet;
      return oidc.userinfo(tokenSet);
    }),
    getInterface(req, 'UserInterface')
  ])
  .then(function(r) {
    defaultRequest({url: '/?objInterface='+r[1]._id+'&user.externalId='+r[0].sub, headers: {authorization: 'Bearer '+req.session.tokenSet.access_token}}, function(error, response, body) {
      if(error) return res.status(500).send(error);
      var user;
      try {
        user = JSON.parse(body)[0];
      } catch(error) {
        return res.status(500).send(error);
      }
      req.session.profile=r[0];
      if(!user) {
        req.session.user='anonymous';
        return res.redirect('/#/notUser');
      }
      req.session.user = user;
      res.redirect('/');
    });
  })
  .catch(function(err) {
    res.status(500).send(err);
  });
});
app.use(function(req, res, next) {
  if(!req.session.user) {
    return res.redirect(oidc.authorizationUrl({redirect_uri: req.protocol+'://'+req.headers.host+'/oidc/callback', scope: 'openid'}));
  }
  if(req.session.user == 'anonymous') delete req.session.user;
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
  var userObj = null;
  var queue = null;
  var tokenSet = null;
  var profile = null;
  var req = socket.request;
  var timeout;

  if(config.redis) queue = require('redis-event-queue')(config.redis).broadcast;

  var setListeners = function() {
    if(!queue) return;
    queue.removeAllListeners();
    if(!userObj) return;
    getInterface(req, 'GroupInterface')
    .then(function(gi) {
      var options = {
        url: '/',
        qs: {
          objInterface: gi._id,
          "group.objLinks": userObj._id
        },
        method: 'GET'
      };
      return bkRequest(options);
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

  socket.on('disconnect', function() {
    if(queue) queue.removeAllListeners();
    if(timeout) clearTimeout(timeout);
  });

  var refreshToken = function() {
    if(tokenSet) {
      if(timeout) clearTimeout(timeout);
      var now = new Date() / 1000 | 0;
      var expires_in = Math.max.apply(null, [tokenSet.expires_at - now, 0]);
      timeout = setTimeout(function () {
        oidc.refresh(tokenSet.refresh_token)
        .then(function (ts) {
          tokenSet = ts;
          refreshToken();
        });
      }, expires_in * 1000);
    }
  };

  var isLoggedIn = function() {
    if(userObj && userObj === req.session.user) return true;
    userObj = req.session.user;
    tokenSet = req.session.tokenSet;
    refreshToken();
    profile = req.session.profile;
    if(userObj) setListeners();
    return !!userObj;
  };

  isLoggedIn();

  var bkRequest = function(options, cb) {
    return new Promise(function(resolve, reject) {
      if(!options.headers) options.headers = {};
      if(!options.headers.authorization && tokenSet) {
        options.headers.authorization = 'Bearer '+tokenSet.access_token;
      }
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

  var setUserData = function() {
    if(profile) {
      socket.emit('userName:set', profile.name);
    } else if(tokenSet){
      oidc.userinfo(tokenSet)
      .then(function(prof) {
        profile = req.session.profile = prof;
        req.session.save();
        socket.emit('userName:set', profile.name);
      });
    }
    if(userObj.user.rootFolder) {
      socket.emit('rootFolder:set', userObj.user.rootFolder);
    } else {
      var options = {
        url: '/'+userObj._id,
        method: 'GET'
      };
      bkRequest(options, function(err, user) {
        if(err) return socket.emit('error', err);
        if(user) {
          req.session.user = user;
          req.session.save();
          isLoggedIn();
          socket.emit('rootFolder:set', user.user.rootFolder);
        }
      });
    }
  };

  socket.on('nouser:profile', function(cb) {
    cb(req.session.profile);
  });

  socket.on('nouser:create', function(cb) {
    if(!req.session.profile) return cb('No profile found.');
    if(!req.session.tokenSet) return cb('Access Token not found.');
    getInterface(req, 'UserInterface')
    .then(function(ui) {
      var options = {
        url: '/',
        method: 'POST',
        json: {
          objInterface: [ui._id],
          objName: req.session.profile.name.toUpperCase(),
          user: {
            externalId: [req.session.profile.sub]
          }
        },
        headers: {
          authorization: 'Bearer '+tokenSet.access_token
        }
      };
      bkRequest(options, function(err, user) {
        if(user) {
          req.session.user = user;
          req.session.save();
          isLoggedIn();
          setUserData();
        }
        cb(err, user);
      });
    });
  });

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
    if(!cb && typeof filter == 'function') {
      cb = filter;
      filter = {};
    }
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    var options = {
      url: '/',
      qs: filter,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('get:userName', function(cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    socket.emit('userName:set', profile.name);
  });

  socket.on('get:folder', function(id, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    if(!cb && typeof id == 'function') {
      cb = id;
      id = userObj.user.rootFolder;
    }
    var wasNotArray = false;
    if(!Array.isArray(id)) {
      wasNotArray = true;
      id = [id];
    }
    getInterface(req, 'FolderInterface')
    .then(function(fi) {
      var options = {
        url: '/',
        qs: {
          objInterface: fi._id,
          _id: {$in: id}
        },
        method: 'GET'
      };
      bkRequest(options)
      .then(function(folders) {
        return Promise.all(folders.map(function(instance) {
          return new Promise(function(resolve, reject) {
            if(!instance.folder.objLinks||!instance.folder.objLinks.length) {
              return resolve(instance);
            }
            var options = {
              url: '/',
              qs: {
                objInterface: fi._id,
                _id: {$in: instance.folder.objLinks}
              },
              method: 'GET'
            };
            bkRequest(options)
            .then(function(subFolders) {
              instance.subFolders = subFolders;
              resolve(instance);
            })
            .catch(reject);
          });
        }));
      })
      .then(function(folders) {
        if(wasNotArray) folders = folders[0];
        return Promise.resolve(folders);
      })
      .nodeify(cb);
    });
  });

  socket.on('get:folder:contents', function(id, cb) {
    if(!isLoggedIn()) return socket.emit('error:auth', 'Unauthorized Access');
    getInterface(req, 'FolderInterface')
    .then(function(fi) {
      var options = {
        url: '/'+id,
        method: 'GET'
      };
      bkRequest(options)
      .then(function(instance) {
        return new Promise(function(resolve, reject) {
          if(!instance.folder.objLinks||!instance.folder.objLinks.length) {
            return resolve([]);
          }
          var options = {
            url: '/',
            qs: {
              _id: {$in: instance.folder.objLinks}
            },
            method: 'GET'
          };
          bkRequest(options)
          .then(function(contents) {
            resolve(contents);
          })
          .catch(reject);
        });
      })
      .nodeify(cb);
    });
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
