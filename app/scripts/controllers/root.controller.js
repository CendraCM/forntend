(function(){
'use strict';

angular.module('cendra')
.controller('RootController', ['$scope', 'io', '$state', '$location', function($scope, io, $state, $location) {
  var vm = this;

  vm.folders = [];

  io.emit('get:userName');

  io.emit('get:folder', function(error, folders) {
    vm.folders = folders||[];
    if(vm.folders.length) {
      if($location.path() == '/') return vm.select(vm.folders[0]);
      if(vm.futureSelectedItem) selectFolder(null, vm.futureSelectedItem);
    }
  });

  var selectFolder = function($event, id) {
    if(!vm.selectedItem || vm.selectedItem._id !== id) {
      vm.folders.forEach(function(folder) {
        if(folder._id == id) {
          vm.selectedItem = folder;
        }
      });
      if(!vm.selectedItem) vm.futureSelectedItem = id;
      else vm.futureSelectedItem = null;
    }
  };

  $scope.$on('cd:folder', selectFolder);

  vm.expand = function(item, cb) {
    if(item.subFolders && item.subFolders.length) {
      item.subFolders.forEach(function(sub, i) {
        io.emit('get:folder', sub._id, function(error, folder) {
          item.subFolders[i] = folder;
        });
      });
      if(cb) cb(item.subFolders);
    }
  };

  vm.select = function(item) {
    $state.go('root.main', {id: item._id});
  };

}]);

})();
