(function(){
  'use strict';

  var template=
    '<md-list ng-switch="schema.type" layout="column" flex>'+
      '<div ng-switch-when="array" ng-repeat="item in ngModel">'+
        '<md-menu-item layout="column" ng-if="getType(schema.items)==\'array\' && schema.items[$index]">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == $index}" ng-click="select($index)">{{$index}}: <span ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) === -1">{{item}}</span></md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) !== -1" schema="schema.items[$index]" ng-model="item" edit="false"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item layout="column" ng-if="getType(schema.items)==\'object\'">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == $index}" ng-click="select($index)">{{$index}}: <span ng-if="[\'array\', \'object\'].indexOf(schema.items.type) === -1">{{item}}</span></md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(schema.items.type) !== -1" schema="schema.items" ng-model="item" edit="false"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item layout="column" ng-if="!schema.items || (getType(schema.items)!=\'object\' && !schema.items[$index])">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == $index}" ng-click="select($index)">{{$index}}: <span ng-if="[\'array\', \'object\'].indexOf(getType(item)) === -1">{{item}}</span></md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(getType(item)) !== -1" ng-model="item" edit="false"></doc-builder>'+
        '</md-menu-item>'+
      '</div>'+
      '<div ng-switch-when="object" ng-repeat="(key, val) in ngModel">'+
        '<md-menu-item layout="column" ng-if="[\'array\', \'object\'].indexOf((schema.properties[key] && schema.properties[key].type)||getType(val)) !== -1">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == key}" ng-click="select(key)">{{key}}:</md-button> <doc-builder schema="schema.properties[key]" ng-model="val" edit="false"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item ng-if="[\'array\', \'object\'].indexOf((schema.properties[key] && schema.properties[key].type)||getType(val)) === -1"><md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == key}"   ng-click="select(key)">{{key}}: {{val}}</md-button></md-menu-item>'+
      '</div  >'+
    '</md-list>'+
    '<div class="md-hue-1" ng-if="edit && (selected.parent||selected.root)" layout="column" ng-switch="selected.schema.type" layout="row">'+
      '<div layout="row" ng-switch-when="array">'+
        '<md-input-container ng-if="!selected.root">'+
          '<label>Tipo Elemento</label>'+
          '<md-select ng-model="selected.schema.type" ng-change="typeChange()">'+
            '<md-option ng-repeat="(key, val) in types" ng-value="key">{{val}}</md-option>'+
          '</md-select>'+
        '</md-input-container>'+
        '<md-button ng-click="arrayAdd()">'+
          'Agregar Item'+
        '</md-button>'+
      '</div>'+
      '<div layout="row" ng-switch-when="object">'+
        '<md-input-container ng-if="!selected.root">'+
          '<label>Tipo Elemento</label>'+
          '<md-select ng-model="selected.schema.type"  ng-change="typeChange()">'+
            '<md-option ng-repeat="(key, val) in types" ng-value="key">{{val}}</md-option>'+
          '</md-select>'+
        '</md-input-container>'+
        '<md-input-container>'+
          '<label>Etiqueta</label>'+
          '<input ng-model="selected.new">'+
        '</md-input-container>'+
        '<md-button ng-click="objectAdd()">'+
          'Agregar'+
        '</md-button>'+
      '</div>'+
      '<div layout="row" ng-switch-default>'+
        '<md-input-container ng-if="!selected.root">'+
          '<label>Tipo Elemento</label>'+
          '<md-select ng-model="selected.schema.type"  ng-change="typeChange()">'+
            '<md-option ng-repeat="(key, val) in types" ng-value="key">{{val}}</md-option>'+
          '</md-select>'+
        '</md-input-container>'+
        '<md-input-container>'+
          '<label>Valor</label>'+
          '<input ng-model="selected.parent[selected.key]">'+
        '</md-input-container>'+
      '</div>'+
    '</divr>';

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
        edit: '<?'
      },
      controller: function($scope, $mdBottomSheet) {
        (!$scope.ngModel && !$scope.edit) && ($scope.edit = true) && ($scope.ngModel={objName: 'New Document'});
        $scope.types = {
          'array': 'Conjunto',
          'date': 'Fecha/Hora',
          'object': 'Formulario',
          'number': 'Número',
          'string': 'Texto',
          'boolean': 'Verdadero/Falso'
        };
        if(!$scope.outerSchema) {
          $scope.schema = buildSchema($scope.ngModel);
        } else {
          $scope.schema = angular.merge({}, $scope.outerSchema);
        }
        $scope.getType = getType;
        $scope.selected = {parent: null, key: null, schema: null};
        $scope.typeChange = function(){
          if($scope.selected.schema.type == $scope.phantom.schema.type) {
            return $scope.selected.parent[$scope.selected.key] = $scope.phantom.value;
          }
          switch($scope.selected.schema.type) {
            case "object":
              $scope.selected.parent[$scope.selected.key] = {};
              break;
            case "array":
              $scope.selected.parent[$scope.selected.key] = [];
              break;
            default:
              $scope.selected.parent[$scope.selected.key] = null;
          }

        };
        $scope.arrayAdd = function() {
          var element = $scope.selected.root||$scope.selected.parent[$scope.selected.key]
          var index = element.push(null) - 1;
          if(getType($scope.selected.schema.items)!='object') {
            !$scope.selected.schema.items && ($scope.selected.schema.items=[]);
            $scope.selected.schema.items[index]={type: 'string'};
          }
          delete $scope.selected.new;
        };
        $scope.objectAdd = function() {
          var element = $scope.selected.root||$scope.selected.parent[$scope.selected.key]
          element[$scope.selected.new] = null;
          !$scope.selected.schema.properties && ($scope.selected.schema.properties={});
          $scope.selected.schema.items[index]={type: 'string'};
        }
        $scope.select = function(key) {
          var schema=null;
          switch($scope.schema.type) {
            case "array":
              var type = getType($scope.schema.items);
              schema = type=='array'?$scope.schema.items[key]:$scope.schema.items;
              break;
            case "object":
              schema = $scope.schema.properties[key];
          }
          if(!schema) {
            schema = {type: getType($scope.ngModel[key])};
          }
          var element = {parent: $scope.ngModel, key: key, schema: schema};
          if($scope.selected.parent == element.parent && $scope.selected.key == element.key) {
            element = {parent: null, key: null, schema: null};
          }
          $scope.$emit('docBuilder:rootSelect', element);
        };
        $scope.$on('docBuilder:select', function($event, element) {
          $scope.selected = element;
        });
        if($scope.edit) {
          $scope.$on('docBuilder:rootSelect', function($event, element) {
            if(!element.parent) {
              element = {schema: $scope.schema, root: $scope.ngModel};
              $scope.phantom = $scope.ngModel;
            } else {
              $scope.phantom = angular.merge({}, {schema: element.schema, value: element.parent[element.key]});
            }
            $scope.$broadcast('docBuilder:select', element);
          });
          $scope.$emit('docBuilder:rootSelect', {});
        }
      },
      link: function(scope, element, attrs) {
      }
    }
  });
})();
