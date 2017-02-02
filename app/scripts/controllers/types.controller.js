(function(){
'use strict';

angular.module('cendra')
.controller('TypesController', ['io', '$state', '$stateParams', '$rootScope', function(io, $state, $stateParams, $rootScope) {
  var vm = this;
  vm.types = vm.types||[];
  io.emit('get:userName');

  var getContents = function() {
    io.emit('list:schema', function(error, contents) {
      vm.types = contents||[];
    });
  };
  getContents();
  //io.on('document:updated:'+$stateParams.id, getContents);

  vm.go = function(type) {
    vm.selected = type;
    $state.go('root.schema', {id: type._id});

  };

  vm.getSelected = function() {
    return vm.selected;
  };

  vm.select = function($event, type) {
    $event && $event.stopPropagation();
    vm.selected = type;
    $rootScope.$broadcast('cd:setTools', []);
    /*if(document == vm.currentFolder) {
      $rootScope.$broadcast('cd:setTools', []);
    } else {
      $rootScope.$broadcast('cd:setTools', [{
        event: 'delete',
        icon: 'delete'
      }]);
    }*/
    $rootScope.$broadcast('cd:selected', type);
  };
}]);

})();
