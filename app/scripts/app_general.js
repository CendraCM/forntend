(function(){
'use strict';

  angular.module('cendra')
  .controller('GeneralController', ['io', function(io) {
    var vm = this;
    if(!vm.name) {
      io.emit('get:userData');
    }
    io.on('userName:set', function(name) {
      vm.name = name;
    })
  }]);

})()
