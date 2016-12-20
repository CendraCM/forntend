(function(){
'use strict';

angular.module('cendra')
.controller('DocController', function($scope, $rootScope, io, $state, $stateParams, $q, $mdToast, $mdDialog, $window) {
  var vm = this;
  var observer;

  $rootScope.$broadcast('cd:info');

  vm.document = {};
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
          vm.document.objName = name;
        })
        .catch(function(){
          $window.history.back();
        });
      io.emit('get:personalGroup', function(error, groups) {
        vm.document.objSecurity = vm.document.objSecurity||{};
        vm.document.objSecurity.owner = vm.document.objSecurity.owner||[];
        groups.forEach(function(group) {
          if(!vm.document.objSecurity.owner.includes(group._id)) {
            vm.document.objSecurity.owner.push(group._id);
          }
        });
      });
    }
    if(jsonpatch) observer = jsonpatch.observe(vm.document);
  });

  vm.done = function(canceled, doc, patches) {
    if(!canceled) {
      if(!doc) {
        if(vm.document._id) {
          $q(function(resolve, reject) {
            io.emit('unlock:document', vm.document._id, function(err, doc) {
              if(err) return reject(err);
              resolve();
            });
          })
          .then(function() {
            var evtName = 'update:document';
            var data = vm.document;
            if(jsonpatch) {
              evtName = 'patch:document';
              data = jsonpatch.generate(observer);
            }
            io.emit(evtName, vm.document._id, data, function(err, doc) {
              if(err) return $mdToast.showSimple(err);
              $scope.$emit('cd:addToFolder', doc);
            });
          });
        } else {
          io.emit('insert:document', vm.document, function(err, doc) {
            if(err) return $mdToast.showSimple(err);
            vm.document = doc;
            $scope.$emit('cd:addToFolder', doc);
          });
        }
      } else {
        if(doc._id) {
          return $q(function(resolve, reject) {
            io.emit('unlock:document', vm.document._id, function(err, doc) {
              if(err) return reject(err);
              resolve();
            });
          })
          .then(function() {
            return $q(function(resolve, reject) {
              var evtName = 'update:document';
              var data = doc;
              if(jsonpatch && patches) {
                evtName = 'patch:document';
                data = patches;
              }
              io.emit(evtName, doc._id, data, function(err, doc) {
                if(err) return reject(err);
                resolve(doc);
              });
            });
          });
        } else {
          return $q(function(resolve, reject) {
            io.emit('insert:document', doc, function(err, doc) {
              if(err) return reject(err);
              resolve(doc);
            });
          });
        }
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

  vm.lock = function(lock, id) {
    return $q(function(resolve, reject) {
      if(lock) {
        io.emit('lock:document', id, function(err, doc) {
          if(err) return reject(err);
          resolve();
        });
      } else {
        io.emit('unlock:document', id, function(err, doc) {
          if(err) return reject(err);
          resolve();
        });
      }
    });
  };



});

})();
