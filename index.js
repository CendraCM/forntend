var express=require('express');
var app = express();
var parser = require('body-parser');
var session = require('express-session');
var request = require('request');
var config = require('/etc/nodejs-config/cendraCM').frontend;
var path = require('path');

app.get('/test', function(req, res, next) {
  res.send('Ok');
});

/*
app.use(function(req, res, next){
  console.log(req.method+' '+req.originalUrl);
  next();
})*/

app.use(session({resave: false, saveUninitialized: false, secret: 'fasñdlfkj2i34u21834udf8u]!!'}));
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'app')));
app.use('/bower_components', express.static(path.join(__dirname, 'bower_components')));

app.use('/backend', function(req, res, next) {
  req.pipe(request(config.backend)).pipe(res);
});

app.listen(config.port);
