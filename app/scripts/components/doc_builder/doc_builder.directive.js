(function(){
  'use strict';

  var template=
    '<md-list ng-switch="schema.type" layout="column" flex>'+
      '<div ng-switch-when="array" ng-repeat="item in ngModel">'+
        '<md-menu-item layout="column" ng-if="getType(schema.items)==\'array\' && schema.items[$index]">'+
          '<md-button ng-click="select($index)">{{$index}}: <span ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) === -1">{{item}}</span></md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) !== -1" schema="schema.items[$index]" ng-model="item" mode="\'C\'"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item layout="column" ng-if="getType(schema.items)==\'object\'">'+
          '<md-button ng-click="select($index)">{{$index}}: <span ng-if="[\'array\', \'object\'].indexOf(schema.items.type) === -1">{{item}}</span></md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(schema.items.type) !== -1" schema="schema.items" ng-model="item" mode="\'C\'"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item layout="column" ng-if="!schema.items || (getType(schema.items)!=\'object\' && !schema.items[$index])">'+
          '<md-button ng-click="select($index)">{{$index}}: <span ng-if="[\'array\', \'object\'].indexOf(getType(item)) === -1">{{item}}</span></md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(getType(item)) !== -1" ng-model="item" mode="\'C\'"></doc-builder>'+
        '</md-menu-item>'+
      '</div>'+
      '<div ng-switch-when="object" ng-repeat="(key, val) in ngModel">'+
        '<md-menu-item layout="column" ng-if="[\'array\', \'object\'].indexOf((schema.properties[key] && schema.properties[key].type)||getType(val)) !== -1">'+
          '<md-button ng-click="select(key)">{{key}}:</md-button> <doc-builder schema="schema.properties[key]" ng-model="val" mode="\'C\'"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item ng-if="[\'array\', \'object\'].indexOf((schema.properties[key] && schema.properties[key].type)||getType(val)) === -1"><md-button ng-click="select(key)">{{key}}: {{val}}</md-button></md-menu-item>'+
      '</div  >'+
    '</md-list>'+
    '<md-toolbar class="md-accent md-hue-1  " ng-if="mode==\'E\' && selected" layout="column">'+
    'hola E'
    '</md-toolbar>';

  var buildSchema = function(element) {
    if(angular.isUndefined(element)) return;
    var schema = {};
    element.objName && (schema.title=element.objName);
    schema.type=getType(element);
    switch(schema.type) {
      case 'array':
        schema.items = [];
        angular.forEach(element, function(value, key) {
          schema.items[key] = buildSchema(value);
        });
        break;
      case 'date':
        schema.type = 'string';
        schema.format = 'date-time';
        break;
      case 'object':
        schema.properties = {};
        angular.forEach(element, function(value, key) {
          schema.properties[key] = buildSchema(value);
        });
        break
    }
    return schema;
  }

  function getType(element) {
    if(angular.isArray(element)) {
      return 'array';
    }
    if(angular.isDate(element)) {
      return 'date';
    }
    if(angular.isObject(element)) {
      return 'object';
    }
    return element==null?'null':typeof element;
  }

  angular.module('cendra.builder', [])
  .directive('docBuilder', function() {
    return {
      restrict: 'E',
      template: template,
      scope: {
        ngModel: '=',
        outerSchema: '=?schema',
        mode: '<?'
      },
      controller: function($scope, $mdBottomSheet) {
        (!$scope.ngModel && !$scope.mode) && ($scope.mode = 'E') && ($scope.ngModel={objName: 'New Document'});
        if(!$scope.outerSchema) {
          $scope.schema = buildSchema($scope.ngModel);
        } else {
          $scope.schema = angular.merge({}, $scope.outerSchema);
        }
        $scope.getType = getType;
        $scope.selected = null;
        $scope.select = function(key) {
          var element = $scope.ngModel[key];
          $scope.$emit('docBuilder:select', element);
        };
        $scope.$on('docBuilder:select', function($event, element) {
          $scope.selected = element;
        });
      },
      link: function(scope, element, attrs) {
        scope.element = element;
      }
    }
  });
})();
