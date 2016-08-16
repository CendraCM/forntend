(function(){
'use strict';

  angular.module('cendra')
  .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $stateProvider
    .state('root', {
      url: '/',
      templateUrl: 'views/main.html',
      controller: 'MainController',
      controllerAs: 'vm'
    })
    .state('document', {
      url: '/document/:id',
      templateUrl: 'views/doc.html',
      controller: 'DocController',
      controllerAs: 'vm'
    })
    .state('notUser', {
      url: '/notUser',
      templateUrl: 'views/notUser.html',
      controller: 'NotUserController',
      controllerAs: 'vm'
    });

    $urlRouterProvider.otherwise('/');
  }]);

})()
