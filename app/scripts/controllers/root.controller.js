(function(){
'use strict';

angular.module('cendra')
.controller('RootController', ['$scope', 'io', '$state', '$location', '$mdDialog', '$q', '$mdSidenav', function($scope, io, $state, $location, $mdDialog, $q, $mdSidenav) {
  var vm = this;

  vm.folders = [];

  var getFolders = function() {
    if($location.path() == '/') {
      io.emit('get:folder:first', function(error, first) {
         vm.select(first);
      });
    } else if(/^\/(document|type)/.test($location.path())) {
      io.emit('get:folder', function(error, folders) {
        vm.folders = folders;
      });
    }
  };

  getFolders();
  if($location.path() == '/types') {
    vm.selectedItem = 'types';
  }

  $scope.$on('$locationChangeSuccess', function() {
    if($location.path() == '/types') {
      vm.selectedItem = 'types';
    } else if(vm.selectedItem) {
      if($location.path() == '/') vm.select(vm.selectedItem);
    } else {
      getFolders();
    }
  });


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
          vm.selectedItem = findFolder(vm.folders, id);
          //  vm.selectedItem = folders[0];
          //var replaced = findFolder(vm.folders, instance, true);
          //if(!replaced) vm.folders.push(instance);
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

  vm.openInfo = true;

  $scope.$on('cd:toggleInfo', function($event) {
    vm.openInfo = !vm.openInfo;
  });

  vm.listTypes = function($event) {
    $event.stopPropagation();
    vm.selectedItem = 'types';
    $state.go('root.schemas');
  };

  vm.actionText = function(action) {
    switch (action) {
      case 'create':
        return 'Creado por';
      case 'modify':
        return 'Modificado por';
      case 'delete':
        return 'Eliminado por';
    }
  };

  $scope.$on('cd:selected', function($event, doc) {
    vm.selectedInfoDoc = doc;
    vm.selectedInfoOwners = null;
    if(doc.objSecurity && doc.objSecurity.owner && doc.objSecurity.owner.length) {
      io.emit('list:document', {_id: {$in: doc.objSecurity.owner}}, function(err, docs) {
        if(err) return;
        vm.selectedInfoOwners = docs.map(function(doc) {
          return doc.objName;
        }).join(', ');
      });
    }
    vm.selectedInfoTypes = 'Documento Base';
    if(doc.objInterface && doc.objInterface.length) {
      io.emit('list:schema', {_id: {$in: doc.objInterface}}, function(err, docs) {
        if(err) return;
        vm.selectedInfoTypes = docs.map(function(doc) {
          return doc.objName;
        }).join(', ');
      });
    }

    vm.selectedInfo = null;
    io.emit('get:document:info', doc._id, function(err, info) {
      if(!info) return;
      info.versions.forEach(function(i) {
        i.formattedDate = moment(i.time / 1000, 'X').format('L LT');
        switch(i.user.type) {
          case 'user':
            i.user = i.user.name+(i.user.root?' (root)':'');
            break;
          default:
            i.user = i.user.type;
        }
      });
      vm.selectedInfo = info;
    });
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

  //vm.createFolder = function(){
  $scope.$on('cd:createFolder', function($event) {
    var prompt = $mdDialog.prompt()
      .title("Nueva Carpeta")
      .ok("Crear")
      .cancel("Cancelar");
    $mdDialog.show(prompt)
    .then(function(folderName) {
      return $q.all([
        $q(function(resolve, reject) {
          io.emit('get:schema:named', 'FolderInterface', function(err, iface) {
            if(err) return reject(err);
            resolve({objName: folderName, objInterface: [iface._id], folder: {objLinks: []}});
          });
        })
        .then(function(nd) {
          return $q(function(resolve, reject) {
            io.emit('insert:document', nd, function(err, doc) {
              if(err) return reject(err);
              resolve(doc);
            });
          });
        }),
        $q(function(resolve, reject) {
          io.emit('get:document', vm.selectedItem._id, function(err, doc) {
            if(err) return reject(err);
            resolve(doc);
          });
        })
      ]);
    })
    .then(function(all) {
      var doc = all[1];
      var subFolder = all[0];
      doc.folder.objLinks.push(subFolder._id);
      return $q(function(resolve, reject) {
        io.emit('update:document', doc._id, doc, function(err, updated) {
          if(err) return reject(err);
          resolve(updated);
        });
      });
    })
    .catch(function(err) {
      $mdToast.showSimple(err);
    });
  });
}]);

})();
