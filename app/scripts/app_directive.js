(function(){
'use strict';

  angular.module('cendra')
  .directive('cdTree', function() {
    var template = [
      '<md-list>',
        '<md-list-item ng-repeat="leaf in tree" layout="column" layout-align="start stretch">',
          '<div layout="row" md-ink-ripple="#9A9A9A" layout-align="center center" ng-click="doSelect($event, leaf)" ng-class="{selected: selectedItem == leaf.item}" class="cd-button">',
            '<md-icon md-ink-ripple="false" ng-if="leaf.children.length && leaf.expanded" class="md-exclude" ng-click="doFold($event, leaf)">keyboard_arrow_down</md-icon>',
            '<md-icon md-ink-ripple="false" ng-if="leaf.children.length && !leaf.expanded" class="md-exclude" ng-click="doExpand($event, leaf)">keyboard_arrow_right</md-icon>',
            '<div ng-if="!leaf.children.length" class="no-child"></div>',
            '<md-icon class="folder">folder</md-icon>',
            '<div class="md-list-item-text" flex>{{leaf.label}}</div>',
          '</div>',
          '<cd-tree ng-if="leaf.children.length && leaf.expanded" child="{{child}}" label="{{label}}" ng-model="leaf.children"></cd-tree>',
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
        filter: '&?',
        selectedItem: '=?'
      },
      template: template,
      controller: ['$scope', function($scope) {
        if(!$scope.child) $scope.child = 'children';
        if(!$scope.label) $scope.label = 'label';
        if(!$scope.select) $scope.select = function noop(){};
        if(!$scope.expand) $scope.expand = function noop(){};
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

        $scope.$on('cdTree:select', function($event, item) {
          $scope.selectedItem = item;
          if($scope.select) $scope.select({item: item});
        });

        $scope.$on('cdTree:expand', function($event, item) {
          if($scope.expand) $scope.expand({item: item});
        });

        $scope.doSelect = function($event, leaf) {
          $scope.$emit('cdTree:select', leaf.item);
          $scope.$broadcast('cdTree:select', leaf.item);
        };

        $scope.doExpand = function($event, leaf) {
          $event.stopPropagation();
          $scope.$emit('cdTree:expand', leaf.item);
          leaf.expanded = true;
        };

        $scope.doFold = function($event, leaf) {
          $event.stopPropagation();
          leaf.expanded = false;
        };
      }]
    };
  });

})();
