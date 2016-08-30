(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['io', '$state', '$stateParams', function(io, $state, $stateParams) {
  var vm = this;
  vm.documents = vm.documents||[];

  io.emit('get:folder:contents', $stateParams.id, function(error, documents) {
    vm.documents = documents||[];
  });

  vm.select = function(id) {
    $state.go('root.document', {id: id});
  };
}]);

})();
