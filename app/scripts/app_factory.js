(function(){
'use strict';

  angular.module('cendra')
  .factory('backend', ['$resource', function($resource) {
    return $resource('/backend/:id', {id: '@_id'}, {
      update: {method: 'PUT'},
      replace: {method: 'PUT', url: '/backend/:id/replace'}
    });
  }]);
  
})()
