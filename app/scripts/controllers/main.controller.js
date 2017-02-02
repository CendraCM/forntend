(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['io', '$state', '$stateParams', '$rootScope', function(io, $state, $stateParams, $rootScope) {
  var vm = this;
  vm.documents = vm.documents||[];
  vm.folders = vm.folders||[];
  vm.fiID = null;
  io.emit('get:userName');
  io.emit('get:schema:named', 'FolderInterface', function(err, fi) {
    if(fi) vm.fiID = fi._id;
  });

  if($stateParams.id) {
    io.emit('get:document', $stateParams.id, function(err, doc) {
      vm.currentFolder = doc;
      vm.select(null, vm.currentFolder);
    });
    $rootScope.$broadcast('cd:folder', $stateParams.id);
    var getContents = function() {
      io.emit('get:folder:contents', $stateParams.id, function(error, contents) {
        vm.documents = [];
        vm.folders = [];
        (contents||[]).forEach(function(content) {
          if(!content.objInterface||content.objInterface.indexOf(vm.fiID) === -1) {
            vm.documents.push(content);
          } else {
            vm.folders.push(content);
          }
        });
      });
    };
    getContents();
    io.on('document:updated:'+$stateParams.id, getContents);
  }

  vm.go = function(document) {
    vm.selected = document;
    if(!document.objInterface||document.objInterface.indexOf(vm.fiID) === -1) $state.go('root.document', {id: document._id});
    else $state.go('root.main', {id: document._id});
  };

  vm.getSelected = function() {
    return vm.selected;
  };

  vm.select = function($event, document) {
    $event && $event.stopPropagation();
    vm.selected = document;
    if(document == vm.currentFolder) {
      $rootScope.$broadcast('cd:setTools', []);
    } else {
      $rootScope.$broadcast('cd:setTools', [{
        event: 'delete',
        icon: 'delete',
        label: 'Borrar'
      }]);
    }
    $rootScope.$broadcast('cd:selected', document);
  };
}]);

})();
