(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['io', '$state', function(io, $state) {
  var vm = this;
  vm.documents = [];
  io.emit('list:rootFolder', function(err, folders) {
    vm.documents = folders;
  });
  vm.select = function(id) {
    $state.go('document', {id: id});
  };
}]);

})();
