(function(){
'use strict';

angular.module('cendra')
.controller('NewController', function() {
  var vm = this;
  vm.schema = {
    title: 'New Document',
    type: 'object',
    properties: {
      item: {
        type: 'string'
      },
      item2: {
        type: 'number'
      },
      item3: {
        type: 'array'
      }
    }
  };

  vm.document = {
    item: 'algo',
    item2: 5,
    item3: ['array', 'de', 'elementos']
  };
});

})();
