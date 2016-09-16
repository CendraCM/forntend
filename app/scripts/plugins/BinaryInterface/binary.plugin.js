(function() {
  'use strict';
  var template =
    '<div class="md-whiteframe-1dp" layout="column" layout-padding>'+
      '<form layout="column">'+
        '<md-button ng-click="upload()">Archivo</md-button>'+
        '<md-button ng-if="!selectedStore && !internal">'+
          '<span>Agregar Store</span>'+
          '<md-icon md-font-set="material-icons">add</md-icon>'+
        '</md-button>'+
        '<div ng-if="selectedStore && !internal" layout="row">'+
          '<span>{{selectedStore.objName}}</span>'+
          '<md-button>'+
            '<span>Cambiar Store</span>'+
            '<md-icon md-font-set="material-icons">sync</md-icon>'+
          '</md-button>'+
        '</div>'+
      '</form>'+
    '</div>';
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
      controller: function($scope, io) {
        $scope.$watch('ngModel', function(value) {
          if(!value.store) $scope.selectedStore = null;
          if(!$scope.selectedStore || $scope.selectedStore._id != value.store) {
            io.emit('get:document', value.store, function(err, doc) {
              $scope.selectedStore = doc;
            });
          }
          $scope.internal = value.internal;
        });
        io.emit('get:schema:named', 'StoreInterface', function(err, int) {
          io.emit('list:document', {ojbInterface: int._id}, function(cb, list) {
            $scope.stores = list;
          });
        });
        $scope.upload = function() {
          angular.element('<input type="file"/>').on('change', function(){
            console.log(this.files);
          })[0  ].click();
        };
      }
    };
  });
})();
