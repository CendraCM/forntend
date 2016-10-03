(function(){
'use strict';

  angular.module('cendra')
  .controller('GeneralController', ['io', '$scope', function(io, $scope) {
    io.on('userName:set', function(name) {
      $scope.name = name;
    });
  }]);
})();
