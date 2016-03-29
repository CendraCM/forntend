(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['document', '$state', function(document, $state) {
  var vm = this;
  vm.documents = document.query()||[];
  vm.select = function(id) {
    $state.go('document', {id: id});
  }
}]);

})();
