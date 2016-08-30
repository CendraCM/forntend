(function(){
'use strict';

angular.module('cendra')
.controller('RootController', ['io', '$state', function(io, $state, $location) {
  var vm = this;

  vm.folders = [];

  io.emit('get:userName');

  io.emit('get:folder', function(error, folders) {
    vm.folders = folders||[];
    if(vm.folders.length) {
      vm.selectedItem = vm.folders[0];
      vm.select(vm.folders[0]);
    }
  });

  vm.expand = function(item) {
    if(item.subFolders && item.subFolders.length) {
      item.subFolders.forEach(function(sub, i) {
        io.emit('get:folder', sub._id, function(error, folder) {
          item.subFolders[i] = folder;
        });
      });
    }
  };

  vm.select = function(item) {
    $state.go('root.main', {id: item._id});
  };

}]);

})();
