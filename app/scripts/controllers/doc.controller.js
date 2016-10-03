(function(){
'use strict';

angular.module('cendra')
.controller('DocController', function($scope, io, $state, $stateParams, $q, $mdToast, $mdDialog) {
  var vm = this;

  vm.document = {};

  if($stateParams.id) {
    io.emit('get:document', $stateParams.id, function(err, doc) {
      if(err) return $mdToast.showSimple(err);
      vm.document = doc;
    });
  } else {
    var prompt = $mdDialog.prompt()
      .title("Título del Documento")
      .placeholder("Título")
      .initialValue("Sin Título")
      .ok("Aceptar")
      .cancel("Calcelar");
    $mdDialog.show(prompt)
      .then(function(name) {
        vm.document = {objName: name};
      });
  }

  io.emit('list:schema', function(err, interfaces) {
    vm.interfaces = interfaces;
  });

  io.emit('list:schema:imp', function(err, interfaces) {
    vm.implementable = interfaces;
  });

  vm.done = function(canceled, doc) {
    if(!canceled) {
      if(!doc) {
        if(vm.document._id) {
          io.emit('update:document', vm.document._id, vm.document, function(err, doc) {
            if(err) return $mdToast.showSimple(err);
            $scope.$emit('cd:addToFolder', doc);
          });
        } else {
          io.emit('insert:document', vm.document, function(err, doc) {
            if(err) return $mdToast.showSimple(err);
            $scope.$emit('cd:addToFolder', doc);
          });
        }
      } else {
        return $q(function(resolve, reject) {
          if(doc._id) {
            io.emit('update:document', doc._id, doc, function(err, doc) {
              if(err) return reject(err);
              resolve(doc);
            });
          } else {
            io.emit('insert:document', doc, function(err, doc) {
              if(err) return reject(err);
              resolve(doc);
            });
          }
        });
      }
    } else {
      $state.go('root.main');
    }
  }

  vm.search = function(filter, one) {
    return $q(function(resolve, reject) {
      if(one) {
        io.emit('get:document', filter, function(err, doc) {
          if(err) return reject(err);
          resolve(doc);
        });
      } else {
        io.emit('list:document', filter, function(err, list) {
          if(err) return reject(err);
          resolve(list);
        });
      }
    });
  };



});

})();
