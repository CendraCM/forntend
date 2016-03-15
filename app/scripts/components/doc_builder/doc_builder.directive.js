(function(){
  'use strict';

  var template=
    '<md-list ng-switch="schema.type" flex>'+
      '<md-list-item ng-switch-when="array" ng-repeat="item in ngModel" ng-click="select($index)">'+
        '<div layout="column" ng-if="angular.isArray(schema.items) && schema.items[$index]">'+
          '<cendra-builder ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) !== -1" schema="schema.items[$index]" ng-model="item" mode="C{{mode==\'E\'?\'E\':\'\'}}"></cendra-builder>'+
          '<span ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) === -1">{{item}}</span>'+
        '</div>'+
        '<div layout="column" ng-if="!angular.isArray(schema.items) && angular.isObject(schema.items)">'+
          '<cendra-builder ng-if="[\'array\', \'object\'].indexOf(schema.items.type) !== -1" schema="schema.items" ng-model="item" mode="C{{mode==\'E\'?\'E\':\'\'}}"></cendra-builder>'+
          '<span ng-if="[\'array\', \'object\'].indexOf(schema.items.type) === -1">{{item}}</span>'+
        '</div>'+
        '<div layout="column" ng-if="angular.isUndefined(schema.items) || (!angular.isObject(schema.items) && !schema.items[$index])">'+
          '<cendra-builder ng-if="angular.isArray(item) || (!angular.isDate(item) && angular.isObject(item))" ng-model="item" mode="C{{mode==\'E\'?\'E\':\'\'}}"></cendra-builder>'+
          '<span ng-if="angular.isDate(item) || (!angular.isArray(item) && !angular.isObject(item))">{{item}}</span>'+
        '</div>'+
      '</md-list-item>'+
      '<md-list-item ng-switch-when="object" ng-repeat="(key, val) in ngModel" ng-click="select(key)">'+
        '<div layout="column" ng-if="schema.properties[key] && ([\'array\', \'object\'].indexOf(schema.properties[key].type) !== -1)">'+
          '<span>{{key}}:</span> <cendra-builder schema="schema.properties[key]" ng-model="val" mode="C{{mode==\'E\'?\'E\':\'\'}}"></cendra-builder>'+
        '</div>'+
        '<div layout="column" ng-if="!schema.properties[key] && !angular.isDate(ngModel[key]) && angular.isObject(ngModel[key])">'+
          '<span>{{key}}:</span> <cendra-builder ng-model="ngModel[key]" mode="C{{mode==\'E\'?\'E\':\'\'}}"></cendra-builder>'+
        '</div>'+
        '<span ng-if="(!schema.properties[key] && (angular.isDate(ngModel[key]) || !angular.isObject(ngModel[key]))) || (schema.properties[key] && [\'array\', \'object\'].indexOf(schema.properties[key].type) === -1)">{{key}}: {{ngModel[key]}}</span>'+
      '</md-list-item>'+
    '</md-list>'+
    '<div ng-if="mode==\'E\'" layout="column">'+
    '</div>';


  var buildSchema = function(element) {
    if(angular.isUndefined(element)) return;
    var schema = {};
    element.objName && (schema.title=element.objName);
    if(angular.isArray(element)) {
      schema.type = 'array';
      schema.items = [];
      angular.forEach(element, function(value, key) {
        schema.items[key] = buildSchema(value);
      });
    } else if(angular.isDate(element)) {
      schema.type = 'string';
      schema.format = 'date-time';
    } else if(angular.isObject(element)) {
      schema.type = 'object';
      schema.properties = {};
      angular.forEach(element, function(value, key) {
        schema.properties[key] = buildSchema(value);
      });
    } else {
      schema.type = element==null?'null':typeof element;
    }
    return schema;
  }

  angular.module('cendra.builder', [])
  .directive('cendraBuilder', function() {
    return {
      restrict: 'E',
      template: template,
      scope: {
        ngModel: '=',
        outerSchema: '=?schema',
        mode: '@'
      },
      controller: function($scope) {
        (!$scope.ngModel && !$scope.mode) && ($scope.mode = 'E') && ($scope.ngModel={objName: 'New Document'});
        if(!$scope.outerSchema) {
          $scope.schema = buildSchema($scope.ngModel);
        } else {
          $scope.schema = angular.merge({}, $scope.outerSchema);
        }
      },
      link: function(scope, element, attrs) {

      }
    }
  });
})();
