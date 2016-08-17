(function(){
'use strict';

angular.module('cendra')
.controller('NotUserController', ['io', '$state', '$scope', function(io, $state, $scope) {
  var vm = this;

  vm.profile=null;

  io.emit('nouser:profile', function(profile) {
    vm.profile = profile;
  });

  vm.create = function() {
    io.emit('nouser:create');
  }
}]);

})();
