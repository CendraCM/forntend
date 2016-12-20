(function(){
'use strict';

angular.module('cendra')
.controller('TypeController', function($scope, $rootScope, io, $state, $stateParams, $q, $mdToast, $mdDialog, $window) {
  var vm = this;

  $rootScope.$broadcast('cd:info');

  vm.schema = {};
  $q.all([
    $q(function(resolve, reject) {
      io.emit('list:schema', function(err, interfaces) {
        vm.interfaces = interfaces;
        resolve();
      });
    }),
    $q(function(resolve, reject) {
      io.emit('list:schema:imp', function(err, interfaces) {
        vm.implementable = interfaces;
        resolve();
      });
    })
  ])
  .then(function() {
    if($stateParams.id) {
      io.emit('get:schema', $stateParams.id, function(err, doc) {
        if(err) return $mdToast.showSimple(err);
        vm.schema = doc;
      });
    } else {
      var prompt = $mdDialog.prompt()
        .title("Título del Tipo Documental")
        .placeholder("Título")
        .initialValue("Sin Título")
        .ok("Aceptar")
        .cancel("Calcelar");
      $mdDialog.show(prompt)
        .then(function(name) {
          vm.schema.objName = name;
        })
        .catch(function(){
          $window.history.back();
        });
      io.emit('get:personalGroup', function(error, groups) {
        vm.schema.objSecurity = vm.schema.objSecurity||{};
        vm.schema.objSecurity.owner = vm.schema.objSecurity.owner||[];
        groups.forEach(function(group) {
          if(!vm.schema.objSecurity.owner.includes(group._id)) {
            vm.schema.objSecurity.owner.push(group._id);
          }
        });
      });
    }
  });

  vm.done = function(canceled) {
    if(!canceled) {
      if(vm.schema._id) {
        $q(function(resolve, reject) {
          io.emit('unlock:document', vm.schema._id, function(err, doc) {
            if(err) return reject(err);
            resolve();
          });
        })
        .then(function() {
          io.emit('update:schema', vm.schema._id, vm.schema, function(err, doc) {
            if(err) return $mdToast.showSimple(err);
            //$scope.$emit('cd:addToFolder', doc);
          });
        });
      } else {
        io.emit('insert:schema', vm.schema, function(err, doc) {
          if(err) return $mdToast.showSimple(err);
          //$scope.$emit('cd:addToFolder', doc);
        });
      }
    } else {
      $state.go('root.main');
    }
  };

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
