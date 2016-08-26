(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['io', '$state', function(io, $state) {
  var vm = this;
  vm.documents = vm.documents||[];
  vm.select = function(id) {
    $state.go('document', {id: id});
  };
}]);

})();
