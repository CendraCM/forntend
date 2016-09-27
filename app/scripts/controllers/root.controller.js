(function(){
'use strict';

angular.module('cendra')
.controller('RootController', ['$scope', 'io', '$state', '$location', function($scope, io, $state, $location) {
  var vm = this;

  vm.folders = [];

  if($location.path() == '/') {
    io.emit('get:folder:first', function(error, first) {
       vm.select(first);
    });
  } else {
    var $m = $location.path().match(/^\/(\w*)/);
    if($m[1]=='document') {
      io.emit('get:folder', function(error, folders) {
        vm.folders = folders;
      });
    }
  }

  var findFolder = function(folders, elem, replace) {
    var id = elem._id||elem;
    if(!folders||!folders.length) return null;
    for(var i in folders) {
      if(folders[i]._id == id) {
        if(replace) folders[i] = elem;
        return folders[i];
      }
      var leaf = findFolder(folders[i].folder.objLinks, elem, replace);
      if(leaf !== null) {
        return leaf;
      }
    }
    return null;
  };

  var getParent = function(id, child) {
    io.emit('get:folder:parents', id, function(error, instance) {
      if(child) instance.folder.objLinks = instance.folder.objLinks.map(function(link, i) {
        return link._id == child._id?child:link;
      });
      else vm.selectedItem = instance;
      var replaced = findFolder(vm.folders, instance, true);
      if(!replaced && instance.parents) {
        return instance.parents.forEach(function(parent) {
          getParent(parent._id, instance);
        });
      }
      if(!vm.folders.length) {
        io.emit('get:folder', function(error, folders) {
          vm.folders = folders;
          var replaced = findFolder(vm.folders, instance, true);
          if(!replaced) vm.folders.push(instance);
        });
      } else {
        vm.folders.push(instance);
      }
    });
  };

  $scope.$on('cd:folder', function($event, id) {
    if(!vm.selectedItem || vm.selectedItem._id !== id) {
      vm.selectedItem = findFolder(vm.folders, id);
      if(!vm.selectedItem) getParent(id);
    }
  });

  $scope.$on('cd:addToFolder', function($event, doc) {
    io.emit('add:folder:link', vm.selectedItem, doc._id);
  });

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
    if(item) $state.go('root.main', {id: item._id});
  };

}]);

})();
