(function(){
'use strict';

  angular.module('cendra')
  .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $stateProvider
    .state('notUser', {
      url: '/notUser',
      templateUrl: 'views/notUser.html',
      controller: 'NotUserController',
      controllerAs: 'vm'
    })
    .state('root', {
      templateUrl: 'views/root.html',
      controller: 'RootController',
      controllerAs: 'vm'
    })
    .state('root.schemas', {
      url: '/types',
      templateUrl: 'views/types.html',
      controller: 'TypesController',
      controllerAs: 'vm'
    })
    .state('root.main', {
      url: '/:id',
      templateUrl: 'views/main.html',
      controller: 'MainController',
      controllerAs: 'vm'
    })
    .state('root.document', {
      url: '/document/:id',
      templateUrl: 'views/doc.html',
      controller: 'DocController',
      controllerAs: 'vm'
    })
    .state('root.schema', {
      url: '/type/:id',
      templateUrl: 'views/type.html',
      controller: 'TypeController',
      controllerAs: 'vm'
    });

    $urlRouterProvider.otherwise('/');
  }]);

})()
