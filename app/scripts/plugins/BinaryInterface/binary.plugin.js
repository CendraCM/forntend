(function() {
  'use strict';
  var template =
    '<div class="md-whiteframe-1dp" layout="column" layout-padding>'+
      '<md-grid-list md-cols="5" md-cols-sm="1" md-row-height="40px">'+
        '<md-grid-tile md-colspan="2" md-colors="::{background: \'default-primary\'}">'+
          '<md-button ng-click="upload()">Archivo</md-button>'+
        '</md-grid-tile>'+
        '<md-grid-tile md-colspan="3"></md-grid-tile>'+
        '<md-grid-tile md-colspan="2" md-colors="::{background: \'default-primary\'}">'+
          '<md-button ng-if="!selectedStore && !internal">'+
            '<span>Agregar Store</span>'+
          '</md-button>'+
        '</md-grid-tile>'+
        '<md-grid-tile md-colspan="3">'+
          '<div ng-if="selectedStore && !internal" layout="row">'+
            '<span>{{selectedStore.objName}}</span>'+
            '<md-button>'+
              '<span>Cambiar Store</span>'+
              '<md-icon md-font-set="material-icons">sync</md-icon>'+
            '</md-button>'+
          '</div>'+
        '</md-grid-tile>'+
      '</md-grid-list>'+
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
