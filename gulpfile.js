var gulp = require('gulp');
var wiredep = require('gulp-wiredep');
var browser = require('browser-sync').create();
var inject = require('gulp-inject');
var watch = require('gulp-watch');
var config = require('/etc/nodejs-config/cendra');
var nodemon = require('gulp-nodemon');
var Docker = require('dockerode');
var gulp_conf = require('./gulp.conf');
var docker = new Docker(gulp_conf.docker);
var package = require('./package');
var tar = require('gulp-tar');
var gitignore = require('gulp-gitignore');
var vfs = require('vinyl-fs');

var reload = browser.reload;

gulp.task('default', ['docker']);

function temp() {
  return gulp.src('./app/index.html').pipe(gulp.dest('.tmp/'));
}

function injectTask() {
  var target = temp();
  // It's not necessary to read the files (will speed up things), we're only after their paths:
  var sources = gulp.src(['./app/**/*.js', './app/**/*.css'], {read: false});

  return target.pipe(inject(sources, {relative: true, ignorePath: '../app'}))
    .pipe(gulp.dest('./app'));
}

gulp.task('tar', ['bower', 'inject'], function() {
  return vfs.src('**/*', {base: '.'}).pipe(gitignore()).pipe(tar(package.name+'.tar')).pipe(gulp.dest('/tmp/'));
});

gulp.task('docker:build', ['tar'], function dockerBuildTask(done) {
  docker.buildImage('/tmp/'+package.name+'.tar', {
    t: package.name+':'+package.version
  }, function(error, stream) {
    stream.pipe(process.stdout);
    stream.on('end', done);
  });
});

gulp.task('docker', ['docker:build'], function dockerCreateTask(done) {
  var container = docker.getContainer(package.name);
  container.remove({force: true}, function(err, data) {
    docker.createContainer({
      Image: package.name+':'+package.version,
      name: package.name,
      Volumes: {
        '/run/service': {},
        '/etc/service-config/service.json': {}
      },
      HostConfig: {
        Binds: [
          '/run/services/'+package.name+':/run/service',
          '/etc/nodejs-config/'+package.name+'.json:/etc/service-config/service.json'
        ]
      }
    }, function(error, container) {
      console.log(error);
      console.log(container);
      container.start(function(error, data) {
        console.log(error);
        console.log(data);
        done();
      });
    })
  })
});

gulp.task('inject', injectTask);

gulp.task('bower', function bowerTask() {
  temp()
    .pipe(wiredep({ignorePath: '..', onError: function(err) { console.log(err)}, onPathInjected: function(path) {console.log(path)}}))
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

gulp.task('serve', ['docker', 'nodemon'], function serveTask() {
  browser.init({
    proxy: 'http://localhost',
    proxyReq: [
        function (proxyReq) {
            console.log('algo');
            proxyReq.setHeader('Host', package.name);
        }
    ]
  });
  gulp.watch(['styles/**/*.scss'], ['sass']);
  watch(['./app/**/*.js', './app/**/*.css'], {events: ['add']}, injectTask);
  gulp.watch('./bower.json', ['bower']);
  gulp.watch(['**/*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: 'app'}, reload);
});
