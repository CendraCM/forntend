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

var sysHeader = 'Basic '+(new Buffer(config.system.user+':'+config.system.pass).toString('base64'));

app.get('/test', function(req, res, next) {
  res.send('Ok');
});

var sessionConfig = {resave: false, saveUninitialized: false, secret: 'fasñdlfkj2i34u21834udf8u]!!'};
if(config.redis) {
  sessionConfig.store = new RedisStore(config.redis);
}

var schema = {
  id: function(id) {
    var r = this.extended?this:extend({extended: true}, this);
    r.schId = id;
    return r;
  },
  imp: function() {
    var r = this.extended?this:extend({extended: true}, this);
    r.schId = 'implementable';
    return r;
  },
  get: function(req, filter) {
    if(!req.session.interfaces) req.session.interfaces = {};
    var schUrl = '/schema';
    var r = this.extended?this:extend({extended: true}, this);
    if(r.schId) {
      schUrl += '/'+r.schId;
      filter = {};
    }
    if(filter && typeof filter == 'string') {
      if(req.session.interfaces[filter]) {
        r.promise = Promise.resolve(req.session.interfaces[filter]);
        return r;
      }
      filter = {objName: filter};
    }
    r.promise = new Promise(function(resolve, reject) {
      defaultRequest({url: schUrl, qs: filter}, function(error, response, body) {
        if(error) return reject(error);
        var uis = [];
        try {
          uis = JSON.parse(body);
        } catch(err) {
          return reject(err);
        }
        for(var i in uis) {
          req.session.interfaces[uis[i].objName] = uis[i];
        }
        req.session.save();

        resolve(uis);
      });
    });

    return r;
  },
  listable: function() {
    this.promise = this.promise.then(function(result) {
      var isListable = function(document) {
        return document.objTag&&document.objTag.indexOf('listable')!==-1;
      };
      if(result.objName) return isListable(result)?result:null;
      if(!Array.isArray(result)) {
        var r = {};
        for(var i in result) {
          if(isListable(result[i])) r[i] = result[i];
        }
        return r;
      }
      return result.filter(isListable);
    });
    return this;
  },
  obj: function() {
    this.promise = this.promise.then(function(result) {
      if(!Array.isArray(result)) return Promise.resolve(result);
      var map = {};
      result.forEach(function(iface) {
        map[iface.objName] = iface;
      });
      return Promise.resolve(map);
    });
    return this;
  },
  limit: function(n) {
    this.promise = this.promise.then(function(result) {
      if(!Array.isArray(result) || result.length <= n) return Promise.resolve(result);
      return Promise.resolve(result.slice(0, n));
    });
    return this;
  },
  first: function() {
    this.promise = this.promise.then(function(result) {
      if(!Array.isArray(result)) return Promise.resolve(result);
      return Promise.resolve(result.shift());
    });
    return this;
  },
  last: function() {
    this.promise = this.promise.then(function(result) {
      if(!Array.isArray(result) || result.length <= n) return Promise.resolve(result);
      return Promise.resolve(result.pop());
    });
    return this;
  },
  then: function(resolve, reject) {
    return this.promise.then(resolve, reject);
  },
  catch: function(reject) {
    return this.promise.catch(reject);
  },
  nodeify: function(cb) {
    return this.promise.nodeify(cb);
  }
};

/*function getInterface(req, filter) {
  if(!req.session.interfaces) req.session.interfaces = {};
  var nameFilter = false;
  if(filter && typeof filter == 'string') {
    if(req.session.interfaces[filter]) return Promise.resolve(req.session.interfaces[filter]);
    filter = {objName: filter};
  }
  return new Promise(function(resolve, reject) {
    defaultRequest({url:'/schema', qs: filter}, function(error, response, body) {
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

      resolve(uis);
    });
  });
}*/

var sessionMiddleware = session(sessionConfig);
app.use(sessionMiddleware);
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));
app.use('/scripts', express.static(path.join(__dirname, 'app/scripts')));
app.use('/css', express.static(path.join(__dirname, 'app/css')));
app.use('/views', express.static(path.join(__dirname, 'app/views')));
app.get('/oidc/callback', function(req, res, next) {
  Promise.all([
    oidc.authorizationCallback(req.protocol+'://'+req.headers.host+'/oidc/callback', req.query)
    .then(function(tokenSet) {
      req.session.tokenSet = tokenSet;
      return oidc.userinfo(tokenSet);
    }),
    schema.get(req, 'UserInterface').first()
  ])
  .then(function(r) {
    defaultRequest({url: '/?objInterface='+r[1]._id+'&user.externalId='+r[0].sub, headers: {authorization: 'Bearer '+req.session.tokenSet.access_token}}, function(error, response, body) {
      if(error) return res.status(500).send(error);
      var user;
      try {
        user = JSON.parse(body)[0];
      } catch(err) {
        return res.status(500).send(err);
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
    schema.get(req, 'GroupInterface')
    .first()
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
          socket.emit('document:inserted:'+doc._id, doc);
        });
        queue.on(prefix+':update:document', function(doc) {
          if(userObj._id == doc._id) userObj = doc;
          socket.emit('document:updated:'+doc._id, doc);
        });
        queue.on(prefix+':delete:document', function(doc) {
          if(userObj._id == doc._id) {
            userObj=null;
            unauthAccess();
            return socket.disconnect();
          }
          socket.emit('document:deleted:'+doc._id, doc);
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
          console.log("new token "+ts);
          tokenSet = ts;
          refreshToken();
        })
        .catch(function(error) {
          console.log(error);
          unauthAccess();
        });
      }, expires_in * 1000);
      console.log("token expires in "+expires_in+" seconds");
    }
  };

  var unauthAccess = function() {
    req.session.user = null;
    req.session.tokenSet = null;
    req.session.save();
    socket.emit('error:auth', 'Unauthorized Access');
  };

  var isLoggedIn = function() {
    if(userObj && userObj === req.session.user) return true;
    userObj = req.session.user;
    tokenSet = req.session.tokenSet;
    if(tokenSet) {
      oidc.introspect(tokenSet.access_token)
      .then(function(result) {
        refreshToken();
      })
      .catch(function(error) {
        console.log(error);
        unauthAccess();
      });
    }
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
    schema.get(req, 'UserInterface')
    .first()
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
          authorization: sysHeader
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

  socket.on('get:personalGroup', function(cb) {
   if(!isLoggedIn()) return unauthAccess();
   schema.get(req, 'GroupInterface')
   .first()
   .then(function(gi) {
     var options = {
       url: '/',
       qs: {
         objInterface: gi._id,
         "group.objLinks": userObj._id,
         "group.personalGroup": true
       },
       method: 'GET'
     };
     return bkRequest(options);
   })
   .nodeify(cb);
  });

  socket.on('insert:document', function(doc, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/',
      json: doc,
      method: 'POST',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('update:document', function(id, doc, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/'+id,
      json: doc,
      method: 'PUT',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('patch:document', function(id, patches, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/'+id,
      json: patches,
      method: 'PATCH',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('lock:document', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/'+id+'/lock',
      method: 'PUT',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('unlock:document', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/'+id+'/lock',
      method: 'DELETE',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('delete:document', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/'+id,
      method: 'DELETE',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('list:document', function(filter, cb) {
    if(!isLoggedIn()) return unauthAccess();
    if(!cb && typeof filter == 'function') {
      cb = filter;
      filter = {};
    }
    var options = {
      url: '/',
      qs: filter,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('get:document:info', function(id, cb) {
    var options = {
      url: '/'+id+'/version',
      method: 'GET'
    };
    return bkRequest(options)
    .then(function(versions) {
      return {versions: versions.reverse()};
    })
    .nodeify(cb);
  });

  socket.on('get:userName', function(cb) {
    if(!isLoggedIn()) return unauthAccess();
    socket.emit('userName:set', profile.name);
  });

  socket.on('get:folder:first', function(cb) {
    if(!isLoggedIn()) return unauthAccess();
    schema.get(req, 'FolderInterface')
    .first()
    .then(function(previousResult) {
      if(userObj.user.rootFolder) return previousResult;
      var options = {
        url: '/'+userObj._id,
        method: 'GET'
      };
      return bkRequest(options)
      .then(function(user) {
        if(user) {
          req.session.user = user;
          req.session.save();
          isLoggedIn();
          socket.emit('rootFolder:set', user.user.rootFolder);
        }
        return previousResult;
      });
    })
    .then(function(fi) {
      var options = {
        url: '/',
        qs: {
          objInterface: fi._id,
          _id: {$in: userObj.user.rootFolder}
        },
        method: 'GET'
      };
      return bkRequest(options);
    })
    .then(function(folders) {
      return folders.length&&folders[0];
    })
    .nodeify(cb);
  });

  socket.on('get:folder:parents', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    schema.get(req, 'FolderInterface')
    .first()
    .then(function(fi) {
      var options = {
        url: '/',
        qs: {
          objInterface: fi._id,
          _id: id
        },
        method: 'GET'
      };
      bkRequest(options)
      .then(function(folders) {
        if(!folders.length) return Promise.resolve();
        var instance = folders[0];
        if(!instance.folder.objLinks||!instance.folder.objLinks.length) return instance;
        var options = {
          url: '/',
          qs: {
            objInterface: fi._id,
            _id: {$in: instance.folder.objLinks}
          },
          method: 'GET'
        };
        return bkRequest(options)
        .then(function(subFolders) {
          instance.folder.objLinks = subFolders;
          return instance;
        });
      })
      .then(function(previousResult) {
        if(userObj.user.rootFolder) return previousResult;
        var options = {
          url: '/'+userObj._id,
          method: 'GET'
        };
        return bkRequest(options)
        .then(function(user) {
          if(user) {
            req.session.user = user;
            req.session.save();
            isLoggedIn();
            socket.emit('rootFolder:set', user.user.rootFolder);
          }
          return previousResult;
        });
      })
      .then(function(instance) {
        if(userObj.user.rootFolder.indexOf(instance._id)!==-1) return instance;
        var options = {
          url: '/',
          qs: {
            objInterface: fi._id,
            "folder.objLinks": id
          },
          method: 'GET'
        };
        return bkRequest(options)
        .then(function(parents) {
          instance.parents = parents;
          return instance;
        });
      })
      .nodeify(cb);
    });
  });

  socket.on('add:folder:link', function(item, id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var p;
    if(!item) {
      p = schema.get(req, 'FolderInterface')
      .first()
      .then(function(fi) {
        var options = {
          url: '/',
          qs: {
            objInterface: fi._id,
            _id: {$in: userObj.user.rootFolder}
          },
          method: 'GET'
        };
        return bkRequest(options);
      })
      .then(function(folders) {
        return folders.length&&folders[0];
      });
    } else {
      p = bkRequest({
        url: '/'+item._id,
        method: 'GET'
      });
    }
    p.then(function(instance) {
      instance.folder.objLinks.push(id);
      var _id = instance._id;
      delete instance._id;
      var options = {
        url: '/'+_id,
        json: instance,
        method: 'PUT',
        headers: {
          authorization: 'Bearer '+tokenSet.access_token
        }
      };
      return bkRequest(options);
    })
    .nodeify(cb);
  });

  socket.on('get:folder', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    if(!cb && typeof id == 'function') {
      cb = id;
      id = userObj.user.rootFolder;
    }
    var wasNotArray = false;
    if(!Array.isArray(id)) {
      wasNotArray = true;
      id = [id];
    }
    schema.get(req, 'FolderInterface')
    .first()
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
              instance.folder.objLinks = subFolders;
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
    if(!isLoggedIn()) return unauthAccess();
    schema.get(req, 'FolderInterface')
    .first()
    .then(function(fi) {
      var options = {
        url: '/'+id,
        method: 'GET'
      };
      bkRequest(options)
      .then(function(instance) {
        return new Promise(function(resolve, reject) {
          if(!instance.folder||!instance.folder.objLinks||!instance.folder.objLinks.length) {
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
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/'+id,
      method: 'GET'
    };
    bkRequest(options, cb);
  });

  socket.on('list:schema', function(filter, cb) {
    if(!isLoggedIn()) return unauthAccess();
    if(!cb && typeof filter == 'function') {
      cb = filter;
      filter = {};
    }
    schema.get(req, filter)
    .nodeify(cb);
  });

  socket.on('list:schema:imp', function(filter, cb) {
    if(!isLoggedIn()) return unauthAccess();
    if(!cb && typeof filter == 'function') {
      cb = filter;
      filter = {};
    }
    schema.imp().get(req, filter)
    .nodeify(cb);
  });


  socket.on('lock:schema', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/schema/'+id+'/lock',
      method: 'PUT',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('unlock:schema', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/schema/'+id+'/lock',
      method: 'DELETE',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

  socket.on('get:schema', function(id, cb) {
    if(!isLoggedIn()) return unauthAccess();
    schema.id(id)
    .get(req)
    .nodeify(cb);
  });

  socket.on('get:schema:named', function(name, cb) {
    if(!isLoggedIn()) return unauthAccess();
    schema.get(req, name)
    .nodeify(cb);
  });

  socket.on('insert:schema', function(sch, cb) {
    if(!isLoggedIn()) return unauthAccess();
    var options = {
      url: '/schema',
      json: sch,
      method: 'POST',
      headers: {
        authorization: 'Bearer '+tokenSet.access_token
      }
    };
    bkRequest(options, cb);
  });

});

server.listen(80);
