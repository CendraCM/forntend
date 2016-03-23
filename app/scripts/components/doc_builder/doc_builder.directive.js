(function(){
  'use strict';

  var template=
    '<form ng-if="!isChild" md-whiteframe="2" layout-padding>'+
      '<div layout="row">'+
        '<md-input-container>'+
          '<label>Titulo Documento</label>'+
          '<input ng-model="ngModel.objName" required/>'+
        '</md-input-container>'+
        '<span flex></span>'+
        '<md-button class="md-icon-button" ng-click="done({canceled: false})">'+
          '<md-icon md-font-set="material-icons">save</md-icon>'+
        '</md-button>'+
        '<md-button class="md-icon-button" ng-click="doCancel()">'+
          '<md-icon md-font-set="material-icons">cancel</md-icon>'+
        '</md-button>'+
      '</div>'+
    '</form>'+
    '<md-list ng-switch="schema.type" layout="column" flex ng-class="{\'md-whiteframe-1dp\': !isChild}">'+
      '<div ng-switch-when="array" ng-repeat="item in ngModel track by $index">'+
        '<md-menu-item layout="column" ng-if="getType(schema.items)==\'array\' && schema.items[$index]">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == $index}" ng-click="select($index)">{{$index}}: '+
            '<span ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) === -1">{{item}}</span>'+
          '</md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(schema.items[$index].type) !== -1" schema="schema.items[$index]" ng-model="item" edit="\'child\'"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item layout="column" ng-if="getType(schema.items)==\'object\'">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == $index}" ng-click="select($index)">{{$index}}: '+
            '<span ng-if="[\'array\', \'object\'].indexOf(schema.items.type) === -1">{{item}}</span>'+
          '</md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(schema.items.type) !== -1" schema="schema.items" ng-model="item" edit="\'child\'"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item layout="column" ng-if="!schema.items || (getType(schema.items)!=\'object\' && !schema.items[$index])">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == $index}" ng-click="select($index)">{{$index}}: '+
            '<span ng-if="[\'array\', \'object\'].indexOf(getType(item)) === -1">{{item}}</span>'+
          '</md-button>'+
          '<doc-builder ng-if="[\'array\', \'object\'].indexOf(getType(item)) !== -1" ng-model="item" edit="\'child\'"></doc-builder>'+
        '</md-menu-item>'+
      '</div>'+
      '<div ng-switch-when="object" ng-repeat="(key, val) in ngModel|objKey:\'!<\':\'obj\'" ng-if="key != \'objName\'">'+
        '<md-menu-item layout="column" ng-if="[\'array\', \'object\'].indexOf((schema.properties[key] && schema.properties[key].type)||getType(val)) !== -1">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == key}" ng-click="select(key)">{{key}}:</md-button> '+
          '<doc-builder schema="schema.properties[key]" ng-model="val" edit="\'child\'"></doc-builder>'+
        '</md-menu-item>'+
        '<md-menu-item ng-if="[\'array\', \'object\'].indexOf((schema.properties[key] && schema.properties[key].type)||getType(val)) === -1">'+
          '<md-button ng-class="{\'md-primary\': selected.parent == ngModel && selected.key == key}"   ng-click="select(key)">{{key}}: {{val}}</md-button>'+
        '</md-menu-item>'+
      '</div  >'+
    '</md-list>'+
    '<form ng-submit="doAction()" ng-if="edit && edit!=\'child\' && (selected.parent||selected.root)" ng-switch="selected.schema.type">'+
      '<div layout="row" ng-switch-when="array" md-whiteframe="2" layout-padding>'+
        '<md-input-container class="schema-type" ng-if="!selected.root">'+
          '<label>Tipo Elemento</label>'+
          '<md-select ng-model="selected.schema.type" ng-change="typeChange()">'+
            '<md-option ng-repeat="(key, val) in types" ng-value="key">{{val}}</md-option>'+
          '</md-select>'+
        '</md-input-container>'+
        '<md-button type="submit">'+
          'Agregar Item'+
        '</md-button>'+
      '</div>'+
      '<div layout="row" ng-switch-when="object" md-whiteframe="2" layout-padding>'+
        '<md-input-container class="schema-type" ng-if="!selected.root">'+
          '<label>Tipo Elemento</label>'+
          '<md-select ng-model="selected.schema.type"  ng-change="typeChange()">'+
            '<md-option ng-repeat="(key, val) in types" ng-value="key">{{val}}</md-option>'+
          '</md-select>'+
        '</md-input-container>'+
        '<md-input-container>'+
          '<label>Etiqueta</label>'+
          '<input ng-model="selected.new" required/>'+
        '</md-input-container>'+
        '<md-button type="submit">'+
          'Agregar'+
        '</md-button>'+
      '</div>'+
      '<div layout="row" ng-switch-default md-whiteframe="2" layout-padding>'+
        '<md-input-container class="schema-type" ng-if="!selected.root">'+
          '<label>Tipo Elemento</label>'+
          '<md-select ng-model="selected.schema.type"  ng-change="typeChange()">'+
            '<md-option ng-repeat="(key, val) in types" ng-value="key">{{val}}</md-option>'+
          '</md-select>'+
        '</md-input-container>'+
        '<md-input-container ng-if="selected.schema.type!=\'boolean\'">'+
          '<label>Valor</label>'+
          '<input ng-model="selected.parent[selected.key]" type="{{selected.schema.format==\'date-time\'?\'datetime\':selected.schema.type}}"/>'+
        '</md-input-container>'+
        '<md-checkbox ng-model="selected.parent[selected.key]" layout="row" layout-align="center center" ng-if="selected.schema.type==\'boolean\'">'+
          '<div layout-fill>{{selected.key}}</div>'+
        '</md-checkbox>'+
      '</div>'+
    '</form>';

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

  function buildDocument(schema) {
    var document = null;
    switch(schema.type) {
      case 'array':
        document = [];
        break;
      case 'object':
        document = {};
        angular.forEach(schema.properties, function(value, key) {
          document[key] = buildDocument(value);
        });
        break;
    }
    return document;
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
  .filter('objKey', function() {
    var filterFn = function(object, action, filterString) {
      var deep = false, not = false, result = {}, origAction = action;
      if(action.substr(0,1).toLowerCase() == 'd') {
        deep = true;
        action = action.substr(1);
      }
      if(action.substr(0,1) == '!') {
        not = true;
        action = action.substr(1);
      }
      angular.forEach(object, function(value, key) {
        var add = false;
        if(action == '=' && ((!not && key == filterString)||(not && key != filterString))) {
          add = true;
        }
        if(action == '<' && ((!not && key.substr(0, filterString.length) == filterString)||(not && key.substr(0, filterString.length) != filterString))) {
          add = true;
        }
        if(action == '>' && ((!not && key.substr(-filterString.length) == filterString)||(not && key.substr(-filterString.length) != filterString))) {
          add = true;
        }
        if(add) {
          if(deep) {
            value = filterFn(value, origAction, filterString);
          }
          result[key] = value;
        }
      });
      return result;
    };
    return filterFn;
  })
  .directive('docBuilder', function() {
    return {
      restrict: 'E',
      template: template,
      scope: {
        ngModel: '=',
        schema: '=?',
        edit: '<?',
        done: '&'
      },
      controller: function($scope, $mdBottomSheet) {
        $scope.isChild = $scope.edit=='child';
        $scope.edit=$scope.isChild?false:$scope.edit;
        if(!$scope.isChild) {
          var modelCopy = $scope.ngModel?angular.merge({}, $scope.ngModel):null;
        }
        if(!$scope.isChild && !$scope.ngModel) {
          $scope.edit = true;
        }
        if($scope.schema && !$scope.ngModel) {
          $scope.ngModel=buildDocument($scope.schema);
        }
        if(!$scope.ngModel) {
          $scope.ngModel={};
        }

        $scope.types = {
          'array': 'Conjunto',
          'date': 'Fecha/Hora',
          'object': 'Formulario',
          'number': 'Número',
          'string': 'Texto',
          'boolean': 'Verdadero/Falso'
        };
        if(!$scope.schema) {
          $scope.schema = buildSchema($scope.ngModel);
        }
        $scope.getType = getType;
        $scope.selected = {parent: null, key: null, schema: null};
        $scope.doCancel = function() {
          $scope.ngModel = modelCopy;
          $scope.done({canceled: true});
        };
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
        $scope.doAction = function() {
          var element = $scope.selected.root||$scope.selected.parent[$scope.selected.key];
          switch($scope.selected.schema.type) {
            case 'array':
              if(getType($scope.selected.schema.items)!='object') {
                var index = element.push(null) - 1;
                !$scope.selected.schema.items && ($scope.selected.schema.items=[]);
                $scope.selected.schema.items[index]={type: 'string'};
              } else {
                var document = buildDocument($scope.selected.schema.items);
                element.push(document);
              }
              break;
            case 'object':
              element[$scope.selected.new] = null;
              !$scope.selected.schema.properties && ($scope.selected.schema.properties={});
              $scope.selected.schema.properties[$scope.selected.new]={type: 'string'};
              delete $scope.selected.new;
              break;
            default:
              if(angular.isNumber($scope.selected.key) && angular.isDefined($scope.selected.parent[$scope.selected.key+1])) {
                $scope.selected.key+=1;
                //$scope.$emit('docBuilder:rootSelect', $scope.selected);
              }
          }
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
        scope.edit != 'child' && element.addClass('root');
      }
    }
  });
})();
