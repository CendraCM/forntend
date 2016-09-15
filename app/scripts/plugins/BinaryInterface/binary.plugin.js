(function() {
  'use strict';
  var template =
    '<div>Binary Interface Template</div>';
  angular.module('binary.plugin', [])
  .directive('binaryInterface', function() {
    return {
      restrict: 'E',
      scope: {
        interface: '=',
        ngModel: '=',
        edit: '<?'
      },
      template: template,
      controller: function($scope) {
        console.log('binary');
      }
    };
  });
})();
