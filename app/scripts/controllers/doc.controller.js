(function(){
'use strict';

angular.module('cendra')
.controller('DocController', function($scope, backend, $state, $stateParams) {
  var vm = this;
  vm.schema = {
    title: 'New Document',
    type: 'object',
    properties: {
      item: {
        type: 'string'
      },
      itema: {
        type: 'array',
      },
      item2: {
        type: 'number'
      },
      item3: {
        type: 'array'
      }
    }
  };

  vm.done = function(canceled) {
    if(!canceled) backend.save(vm.document);
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
