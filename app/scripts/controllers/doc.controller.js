(function(){
'use strict';

angular.module('cendra')
.controller('DocController', function($scope, io, $state, $stateParams) {
  var vm = this;

  io.emit('list:schema', function(err, interfaces) {
    vm.interfaces = interfaces;
  });

  vm.done = function(canceled) {
    if(!canceled) {
      if(vm.document._id) document.update(vm.document);
      else document.save(vm.document);

    }
    $state.go('root');
  }

/*  vm.document = {
    item: 'algo',
    itema: ['otro', 'array'],
    item2: 5,
    item3: ['array', 'de', 'elementos', ['con', 'otro', 'array']]
  };*/

});

})();
