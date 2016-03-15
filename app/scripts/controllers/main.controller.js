(function(){
'use strict';

angular.module('cendra')
.controller('MainController', ['backend', function(backend) {
  var vm = this;
  vm.documents = backend.query()||[];
}]);

})();
