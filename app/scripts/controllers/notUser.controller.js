(function(){
'use strict';

angular.module('cendra')
.controller('NotUserController', ['io', '$state', '$location', function(io, $state, $location) {
  var vm = this;

  vm.profile=null;

  io.emit('nouser:profile', function(profile) {
    vm.profile = profile;
  });

  vm.create = function() {
    io.emit('nouser:create', function(err, user) {
      $state.go('root.main');
    });
  };
}]);

})();
