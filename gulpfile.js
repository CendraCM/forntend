var gulp = require('gulp');
var wiredep = require('gulp-wiredep');
var browser = require('browser-sync').create();
var inspector = require('browser-sync').create();
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
var httpProxy = require('http-proxy');
var net = require('net');

//var reload = browser.reload;

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

function dockerCreateTask(done) {
  var container = docker.getContainer(package.name);
  container.remove({force: true}, function(err, data) {
    docker.createContainer({
      Image: package.name+':'+package.version,
      name: package.name,
      Volumes: gulp_conf.volumes,
      HostConfig: {
        Binds: gulp_conf.binds,
        Links: gulp_conf.links
      }
    }, function(error, container) {
      container.start(function(error, data) {
        console.log(error);
        console.log(data);
        done();
      });
    });
  });
}

function dockerDebugTask(done) {
  var container = docker.getContainer(package.name);
  container.remove({force: true}, function(err, data) {
    docker.createContainer({
      Image: package.name+':'+package.version,
      name: package.name,
      Volumes: gulp_conf.volumes,
      HostConfig: {
        Binds: gulp_conf.binds,
        Links: gulp_conf.links
      },
      Entrypoint: ["/opt/project/entrypoint.sh", "debug"]
    }, function(err, container) {
      if(err) return done(err);
      container.attach({
        stream: true,
        stdout: true,
        stderr: true,
        tty: true
      }, function(err, stream) {
        if(err) return done(err);

        stream.pipe(process.stdout);

        container.start(function(err, data) {
          if(err) return done(err);
          done && done();
        });
      });
    });
  });
}

var BROWSER_SYNC_RELOAD_DELAY = 500;

function serveTask() {
  browser.init({
    proxy: {
      target: 'http://localhost',
      ws: true,
      proxyReq: [
          function (proxyReq) {
              proxyReq.setHeader('Host', package.name+'.unc.edu.ar');
          }
      ]
    },
    logLevel: 'debug',
    errHandler: function(error) {
      console.log(error);
    }
  });
  gulp.watch(['index.js'], ['docker:create']);
  gulp.watch(['styles/**/*.scss'], ['sass', 'docker:create']);
  watch(['./app/**/*.js', './app/**/*.css'], {events: ['add']}, function() {
    injectTask().on('end', function() {
      dockerCreateTask();
    });
  });
  gulp.watch('./bower.json', ['bower', 'docker:create']);
  gulp.watch(['**/*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: 'app'}, ['reload']);
}

function serveInspectorTask() {

  var portrange = 45032;

  function getPort (cb) {
    var port = portrange;
    portrange += 1;

    var server = net.createServer();
    server.listen(port, function (err) {
      server.once('close', function () {
        cb(port);
      });
      server.close();
    });
    server.on('error', function (err) {
      getPort(cb);
    });
  }

  getPort(function(port) {
    httpProxy.createServer({target: 'http://localhost', ws:true, headers: {'Host': package.name+'__8080__.unc.edu.ar'}}).listen(port);
    console.log("node inspector listening on http://localhost:"+port+'/?port=5858');
  });

  browser.init({
    proxy: {
      target: 'http://localhost',
      ws: true,
      proxyReq: [
          function (proxyReq) {
              proxyReq.setHeader('Host', package.name+'.unc.edu.ar');
          }
      ]
    }
  });
  gulp.watch(['index.js'], ['docker:debug']);
  gulp.watch(['styles/**/*.scss'], ['sass', 'docker:debug']);
  watch(['./app/**/*.js', './app/**/*.css'], {events: ['add']}, function() {
    injectTask().on('end', function() {
      dockerDebugTask();
    });
  });
  gulp.watch('./bower.json', ['bower', 'docker:debug']);
  gulp.watch(['**/*.html', 'styles/**/*.css', 'scripts/**/*.js'], {cwd: 'app'}, ['reload:inspector']);
}

gulp.task('sass', function sassTask() {
  return gulp.src('./app/styles/**/*.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./app/styles'));
});

gulp.task('inject', injectTask);

gulp.task('bower', function bowerTask() {
  temp()
    .pipe(wiredep({ignorePath: '..', onError: function(err) { console.log(err); }}))
    .pipe(gulp.dest('app'));
});

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

gulp.task('docker:create', ['docker:build'], dockerCreateTask);

gulp.task('docker:debug', ['docker:build'], dockerDebugTask);

gulp.task('reload', ['docker:create'], function reloadTask() {
  browser.reload();
});

gulp.task('reload:inspector', ['docker:debug'], function reloadInspectorTask() {
  browser.reload();
  inspector.reload();
});

gulp.task('serve', ['docker:create'], serveTask);

gulp.task('debug', ['docker:debug'], serveInspectorTask);

gulp.task('proxy', serveTask);

gulp.task('default', ['docker:create']);
