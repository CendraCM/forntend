(function(){
'use strict';

angular.module('cendra')
.controller('RootController', ['io', '$state', function(io, $state, $location) {
  var vm = this;

  vm.folders = [];

  io.emit('get:userName');

  io.emit('get:folder', function(error, folders) {
    vm.folders = folders||[];
  });

}]);

})();
