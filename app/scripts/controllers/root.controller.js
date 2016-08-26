(function(){
'use strict';

angular.module('cendra')
.controller('RootController', ['io', '$state', function(io, $state, $location) {
  var vm = this;

  vm.folders = vm.folders||[];

  if(!vm.folders.length) io.emit('get:userData');

  io.on('baseDirectory:set', function(dirs) {
    vm.folders = [];
    dirs.forEach(function(dir, i) {
      io.emit('get:document', dir, function(err, doc) {
        vm.folders[i] = doc;
      });
    });
  });

}]);

})();
