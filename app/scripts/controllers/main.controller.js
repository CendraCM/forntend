(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['backend', '$state', function(backend, $state) {
  var vm = this;
  vm.documents = backend.query()||[];
  vm.select = function(id) {
    $state.go('document', {id: id});
  }
}]);

})();
