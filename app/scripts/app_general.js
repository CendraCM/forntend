(function(){
'use strict';

  angular.module('cendra')
  .controller('GeneralController', ['io', function(io) {
    var vm = this;
    io.on('userName:set', function(name) {
      vm.name = name;
    });
  }]);
})();
