(function(){
'use strict';

  angular.module('cendra')
  .controller('GeneralController', ['io', '$scope', function(io, $scope) {
    $scope.tools = [];

    io.on('userName:set', function(name) {
      $scope.name = name;
    });

    $scope.toggleInfo = function() {
      $scope.$broadcast('cd:toggleInfo');
    };

    $scope.$on('cd:setTools', function($event, tools) {
      $scope.tools = tools;
    });

    $scope.fireTool = function(tool, data) {
      $scope.$broadcast('cd:fireTool:'+tool, data);
    };

    $scope.createFolder = function() {
      $scope.$broadcast('cd:createFolder');
    };

  }]);
})();
