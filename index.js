var express=require('express');
var app = express();
var parser = require('body-parser');
var session = require('express-session');
var request = require('request');
var config = require('/etc/service-config/service');
var path = require('path');
var fs = require('fs');
var extend = require('extend');


app.get('/test', function(req, res, next) {
  res.send('Ok');
});

app.use(session({resave: false, saveUninitialized: false, secret: 'fasñdlfkj2i34u21834udf8u]!!'}));
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'app')));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));

app.use(function(req, res, next) {
  console.log(req.method+' '+req.originalUrl+' %j', req.body);
  next();
});

app.use('/backend', function(req, res, next) {
  console.log('%j', config);
  var headers = extend({}, req.headers);
  delete headers.host;
  var options = {
    url: config.backend+req.url,
    method: req.method,
    headers: headers
  };
  if(["POST", "PUT", "PATCH"].indexOf(req.method) !== -1) {
    options.json = req.body||'';
  }
  console.log('%j', options);
  request(options, function(error, response, body) {
    if(error) return res.status(500).send(error);
    res.set(response.headers)
    res.status(response.statusCode).send(body);
  })
  /*req.pipe(request(config.backend).on('error', function(error){
    console.log('Error: '+error);
  })).pipe(res);*/
});

app.listen(80);
