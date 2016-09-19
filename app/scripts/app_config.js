(function() {
'use strict';

  angular.module('cendra')
  .config(['$mdThemingProvider', function($mdThemingProvider) {
    $mdThemingProvider
      .theme('default')
      .primaryPalette('indigo')
      .accentPalette('pink')
      .warnPalette('deep-orange')
      .backgroundPalette('grey');
    $mdThemingProvider.enableBrowserColor();
  }]);
})()
