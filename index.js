var express=require('express');
var app = express();
var parser = require('body-parser');
var session = require('express-session');
var request = require('request');

app.get('/test', function(req, res, next) {
  res.send('Ok');
});

app.use(session());
app.use(parser.json());
