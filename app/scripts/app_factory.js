(function(){
'use strict';

  angular.module('cendra')
  .factory('document', ['$resource', function($resource) {
    return $resource('/backend/:id', {id: '@_id'}, {
      update: {method: 'PUT'},
      replace: {method: 'PUT', url: '/backend/:id/replace'}
    });
  }])
  .factory('io', ['$location', '$mdToast', '$rootScope', function($location, $mdToast, $scope) {
    var socket = io();//io('/', {transports: ['websocket']});
    socket.on('error:auth', function(msg) {
      $scope.$apply(function() {
        $mdToast.showSimple(msg);
        window.location.href=$location.url();
      });
    });

    return {
      on: function() {
        var last = arguments[arguments.length -1];
        if(typeof last == 'function') {
          arguments[arguments.length - 1] = function() {
            var args = arguments;
            $scope.$apply(function() {
              last.apply(socket, args);
            });
          };
        }
        socket.on.apply(socket, arguments);
        var args = arguments;
        return function() {
          socket.off.apply(socket, args);
        };
      },
      emit: function() {
        var last = arguments[arguments.length -1];
        if(typeof last == 'function') {
          arguments[arguments.length - 1] = function() {
            var args = arguments;
            $scope.$apply(function() {
              last.apply(socket, args);
            });
          };
        }
        socket.emit.apply(socket, arguments);
      }
    };
  }])
  .factory('user', ['io', function(io) {
    var userVar;
    io.emit('get:user', function(error, user) {
      userVar = user;
    });
    return {
      get: function() {
        return userVar;
      }
    };
  }])
  .factory('locationHistory', ['$rootScope', '$location', '$state', function($rootScope, $location, $state) {
    var history = [$location.path()];
    $rootScope.$on('$locationChangeSuccess', function() {
      history.push($location.path());
    });
    return {
      back: function(state) {
        if(history.length > 1) return $location.path(history.splice(-2)[0]);
        return $state.go(state);
      }
    };
  }]);
})();
