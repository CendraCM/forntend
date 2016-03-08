(function(){
'use strict';

angular.module('cendra')
.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('root', {
    url: '/',
    templateUrl: 'views/main.html',
    controller: 'MainController',
    controllerAs: 'vm'
  })
  .state('new', {
    url: '/new',
    templateUrl: 'views/new.html',
    controller: 'NewController',
    controllerAs: 'vm'
  });

  $urlRouterProvider.otherwise('/');
})

})()
