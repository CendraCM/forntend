(function(){
'use strict';

  angular.module('cendra')
  .directive('cdTree', function() {
    var template = [
      '<md-list>',
        '<md-list-item ng-repeat="leaf in tree">',
          '<md-icon ng-if="leaf.children.length && leaf.expanded">keyboard_arrow_down</md-icon>',
          '<md-icon ng-if="leaf.children.length && !leaf.expanded">keyboard_arrow_right</md-icon>',
          '<md-icon>folder</md-icon>',
          '<md-icon>{{leaf.label}}</md-icon>',
          '<md-tree ng-if="leaf.children.length" child="{{child}}" label="{{label}}" ng-model="leaf.children"></md-tree>',
        '</md-list-item>',
      '</md-list>'
    ].join('');
    return {
      restrict: 'E',
      scope: {
        model: '=ngModel',
        child: '@',
        label: '@'
      },
      template: template,
      controller: ['$scope', function($scope) {
        if(!$scope.child) $scope.child = 'children';
        if(!$scope.label) $scope.label = 'label';
        console.log($scope);
        $scope.$watch('model', function mktree(model) {
          if(!model) return;
          $scope.tree = model.map(function(item) {
            var leaf = {expanded: false};
            leaf.child = $scope.child.split('.').reduce(function(memo, path) {
              if(memo==null||!memo[path]) return null;
              return memo[path];
            }, model)||[];
            leaf.label = $scope.label.split('.').reduce(function(memo, path) {
              if(memo==null||!memo[path]) return null;
              return memo[path];
            }, model)||'';
          });
        });

      }]
    }
  })

})();
