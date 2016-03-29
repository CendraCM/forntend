(function(){
'use strict';

angular.module('cendra')
.controller('DocController', function($scope, document, schema, $state, $stateParams) {
  var vm = this;
  if($stateParams.id) {
    document.get($stateParams).$promise.then(function(doc) {
      delete doc.$promise;
      delete doc.$resolved;
      vm.document = doc;
    });
  }
  /*vm.schema = {
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
  };*/

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
