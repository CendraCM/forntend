(function(){
'use strict';

  angular.module('cendra')
  .controller('GeneralController', ['io', '$scope', function(io, $scope) {
    io.on('userName:set', function(name) {
      $scope.name = name;
    });

    $scope.toggleInfo = function() {
      $scope.$broadcast('cd:toggleInfo');
    };

    $scope.createFolder = function() {
      $scope.$broadcast('cd:createFolder');
    };

  }]);
})();
