(function(){
'use strict';

angular.module('cendra')
.controller('DocController', function($scope, io, $state, $stateParams) {
  var vm = this;
  /*if($stateParams.id) {
    document.get($stateParams).$promise.then(function(doc) {
      delete doc.$promise;
      delete doc.$resolved;
      vm.document = doc;
    });
  }

  vm.schema = {
    "objName": "ENotaClass",
    "objTitle": {
      "en_US": "Note",
      "es_AR": "Nota"
    },
    "objDescription": {
      "en_US": "Note",
      "es_AR": "Nota"
    },
    "type": "object",
    "properties": {
      "objName": {
        "type": "string"
      },
      "objTitle": {
        "type": "string"
      },
      "objDescription": {
        "type": "string",
        "default": "Nota"
      },
      "objImplements": {
        "type": "string"
      },
      "objTags": {
        "type": "array",
        "items": {
          "type": "string",
          "default": "Nota"
        }
      },
      "city": {
        "type": "string"
      },
      "reference": {
        "type": "string"
      },
      "body": {
        "type": "string"
      },
      "created": {
        "type": "string",
        "format": "date-time"
      },
      "adminUnit": {
        "type": "string"
      },
      "user": {
        "type": "string"
      },
      "pdf": {
        "type": "string"
      }
    },
    "required": [
      "objName",
      "city",
      "body"
    ],
    "_id": "56fc34da09a98486535f030f"
  };*/

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
