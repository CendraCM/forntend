var gulp = require('gulp');
var wiredep = require('wiredep').stream;
var browser = require('browser-sync').create();
var inject = require('gulp-inject');
var watch = require('gulp-watch');
var request = require('request');
var config = require('/etc/nodejs-config/cendraCM').frontend;
var nodemon = require('gulp-nodemon');

var reload = browser.reload;

gulp.task('default', ['bower', 'inject']);

function injectTask() {
  var target = gulp.src('./app/index.html');
  // It's not necessary to read the files (will speed up things), we're only after their paths:
  var sources = gulp.src(['./app/**/*.js', './app/**/*.css'], {read: false});

  return target.pipe(inject(sources, {relative: true}))
    .pipe(gulp.dest('./app'));
}

gulp.task('inject', injectTask);

gulp.task('bower', function bowerTask() {
  gulp.src('app/index.html')
    .pipe(wiredep({ignorePath: '..'}))
    .pipe(gulp.dest('app'));
});

gulp.task('sass', function sassTask() {
  return gulp.src('./app/styles/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./app/styles'));
});

var BROWSER_SYNC_RELOAD_DELAY = 500;

gulp.task('nodemon', function (cb) {
  var called = false;
  return nodemon({

    // nodemon our expressjs server
    script: 'index.js',

    // watch core server file(s) that require server restart on change
    watch: ['index.js']
  })
    .on('start', function onStart() {
      // ensure start only got called once
      if (!called) { cb(); }
      called = true;
    })
    .on('restart', function onRestart() {
      // reload connected browsers after a slight delay
      setTimeout(function reload() {
        browser.reload({
          stream: false
        });
      }, BROWSER_SYNC_RELOAD_DELAY);
    });
});

gulp.task('serve', ['bower', 'inject', 'nodemon'], function serveTask() {
  browser.init({
    proxy: 'http://localhost:'+config.port
  });
  gulp.watch(['styles/**/*.scss'], ['sass']);
  watch(['./app/**/*.js', './app/**/*.css'], {events: ['add']}, injectTask);
  gulp.watch('./bower.json', ['bower']);
  gulp.watch(['**/*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: 'app'}, reload);
});
