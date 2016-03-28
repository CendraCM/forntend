(function(){
'use strict';

  angular.module('cendra')
  .factory('document', ['$resource', function($resource) {
    return $resource('/backend/:id', {id: '@_id'}, {
      update: {method: 'PUT'},
      replace: {method: 'PUT', url: '/backend/:id/replace'}
    });
  }])
  .factory('schema', ['$resource', function($resource) {
    return $resource('/backend/schema/:id', {id: '@_id'}, {
      update: {method: 'PUT'},
      replace: {method: 'PUT', url: '/backend/schema/:id/replace'}
    });
  }]);

})()
