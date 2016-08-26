(function(){
'use strict';

  angular.module('cendra')
  .directive('cdTree', function() {
    var template = [
      '<md-list>',
        '<md-list-item ng-repeat="leaf in tree" ng-click="doSelect(leaf)" ng-class="{selected: selectedItem == leaf}">',
          '<md-icon ng-if="leaf.children.length && leaf.expanded" class="md-exclude" ng-click="leaf.expanded = false">keyboard_arrow_down</md-icon>',
          '<md-icon ng-if="leaf.children.length && !leaf.expanded" class="md-exclude" ng-click="doExpand(leaf)">keyboard_arrow_right</md-icon>',
          '<md-icon>folder</md-icon>',
          '<div class="md-list-item-text" flex>{{leaf.label}}</div>',
          '<md-tree ng-if="leaf.children.length && leaf.expanded" child="{{child}}" label="{{label}}" ng-model="leaf.children" select="select" expand="expand"></md-tree>',
        '</md-list-item>',
      '</md-list>'
    ].join('');
    return {
      restrict: 'E',
      scope: {
        model: '=ngModel',
        child: '@',
        label: '@',
        select: '&?',
        expand: '&?',
        filter: '&?'
      },
      template: template,
      controller: ['$scope', function($scope) {
        if(!$scope.child) $scope.child = 'children';
        if(!$scope.label) $scope.label = 'label';
        console.log($scope);
        $scope.$watch('model', function mktree(model) {
          if(!model) return;
          $scope.tree = model.map(function(item) {
            var leaf = {expanded: false, item: item};
            var children = $scope.child.split('.').reduce(function(memo, path) {
              if(memo===null||!memo[path]) return null;
              return memo[path];
            }, item)||[];
            if($scope.filter) {
              children = children.filter(function(child) {
                return $scope.filter({item: child});
              });
            }
            leaf.children = children;
            leaf.label = $scope.label.split('.').reduce(function(memo, path) {
              if(memo===null||!memo[path]) return null;
              return memo[path];
            }, item)||'';
            return leaf;
          });
        }, true);
        $scope.doSelect = function(leaf) {
          $scope.$emit('cdTree:leaf:selected', leaf);
          $scope.$broadcast('cdTree:leaf:selected', leaf);
          $scope.$on('cdTree:leaf:selected', function(leaf) {
            if($scope.tree.indexOf(leaf) === -1) {
              $scope.selectedItem = null;
            } else {
              $scope.selectedItem = leaf;
              if($scope.select) $scope.select({leaf: leaf.item});
              $scope.$emit('cdTree:select', leaf.item);
            }
          });
        };

        $scope.doExpand = function(leaf) {
          if($scope.expand) {
            $scope.expand({leaf: leaf, done: function(err) {
              if(!err) leaf.expanded = true;
            }});
          } else {
            leaf.expanded = true;
          }
        };
      }]
    };
  });

})();
