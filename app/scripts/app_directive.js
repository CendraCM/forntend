(function(){
'use strict';

  angular.module('cendra')
  .directive('cdTree', function() {
    var template = [
      '<div ng-repeat="leaf in tree" class="leaf" layout="column" layout-align="start stretch">',
        '<div layout="row" md-ink-ripple="#9A9A9A" layout-align="center center" ng-click="doSelect($event, leaf)" ng-class="{selected: selectedItem == leaf}" class="cd-button">',
          '<div ng-repeat="space in spaces" class="space"></div>',
          '<md-icon md-ink-ripple="false" ng-if="leaf.folder.objLinks.length && leaf.expanded" class="md-exclude" ng-click="doFold($event, leaf)">keyboard_arrow_down</md-icon>',
          '<md-icon md-ink-ripple="false" ng-if="leaf.folder.objLinks.length && !leaf.expanded" class="md-exclude" ng-click="doExpand($event, leaf)">keyboard_arrow_right</md-icon>',
          '<div ng-if="!leaf.folder.objLinks.length" class="space"></div>',
          '<md-icon class="folder">folder</md-icon>',
          '<div class="md-list-item-text" flex>{{leaf.objName}}</div>',
        '</div>',
        '<cd-tree ng-if="leaf.folder.objLinks.length" ng-show="leaf.expanded" child="true" ng-model="leaf.folder.objLinks" selected-item="selectedItem" level="{{level}}"></cd-tree>',
      '</div>'
    ].join('');
    return {
      restrict: 'E',
      scope: {
        tree: '=ngModel',
        select: '&?',
        expand: '&?',
        selectedItem: '=?',
        child: '@?',
        level: '@?'
      },
      template: template,
      compile: function() {
        return {
          pre: function(scope) {
            console.log('compila cdTree');
          }
        };
      },
      controller: ['$scope', 'io', function($scope, io) {
        $scope.spaces = [];
        $scope.level = parseInt($scope.level||0);
        var n = 0;
        while(n < $scope.level) {
          $scope.spaces.push(null);
          n++;
        }
        $scope.level++;
        var offEvents = [];
        $scope.$watchCollection('tree', function(value) {
          offEvents.forEach(function(off) {
            off();
          });
          (value||[]).forEach(function(leaf, i, tree) {
            if(leaf._id) {
              offEvents.push(io.on('document:updated:'+leaf._id, function(doc) {
                io.emit('get:folder', leaf._id, function(err, folder) {
                  if(folder) {
                    folder.expanded = leaf.expanded;
                    tree[i] = folder;
                  }
                });
              }));
            }
          });
        });

        $scope.$on('$destroy', function() {
          offEvents.forEach(function(off) {
            off();
          });
        });

        $scope.$on('cdTree:select', function($event, item) {
          $scope.selectedItem = item;
          if(!$scope.child && item) $scope.select({item: item});
        });

        $scope.$watch('selectedItem', function(leaf) {
          if($scope.tree.indexOf(leaf)!==-1 && $scope.child) $scope.$emit('cdTree:parent:expand', $scope.tree);
        });

        $scope.$on('cdTree:parent:expand', function($event, tree) {
          if(!$scope.child) $event.stopPropagation();
          $scope.tree.forEach(function(leaf) {
            if(leaf.folder && leaf.folder.objLinks == tree) leaf.expanded = true;
          });
        });

        if(!$scope.child) {
          $scope.$on('cdTree:expand', function($event, item) {
            if($scope.expand) $scope.expand({item: item});
          });
        }

        $scope.doSelect = function($event, leaf) {
          $scope.$emit('cdTree:select', leaf);
          $scope.$broadcast('cdTree:select', leaf);
        };

        $scope.doExpand = function($event, leaf) {
          $event.stopPropagation();
          $scope.$emit('cdTree:expand', leaf);
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
