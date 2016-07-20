(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['io', '$state', function(io, $state) {
  var vm = this;
  vm.documents = [];
  io.emit('list:document', function(err, documents) {
    vm.documents = documents;
  });
  vm.select = function(id) {
    $state.go('document', {id: id});
  };
}]);

})();
