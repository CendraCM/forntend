(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['io', '$state', '$stateParams', '$rootScope', function(io, $state, $stateParams, $rootScope) {
  var vm = this;
  vm.documents = vm.documents||[];
  vm.fiID = null;
  io.emit('get:schema:named', 'FolderInterface', function(err, fi) {
    if(fi) vm.fiID = fi._id;
  });

  if($stateParams.id) {
    $rootScope.$broadcast('cd:folder', $stateParams.id);

    io.emit('get:folder:contents', $stateParams.id, function(error, documents) {
      vm.documents = documents||[];
    });
  }

  vm.select = function(document) {
    if(document.objInterface.indexOf(vm.fiID) === -1) $state.go('root.document', {id: document._id});
    else $state.go('root.main', {id: document._id});
  };
}]);

})();
