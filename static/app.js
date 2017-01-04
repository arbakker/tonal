'use strict';

// Declare app level module which depends on views, and components
var myApp=angular.module('myApp', [
  'ngRoute',
  'base64',
  'angular.img',
  'ui.bootstrap',
  'LocalStorageModule',
  'myApp.home',
  'myApp.artists',
  'myApp.artist',
  'myApp.album'
]).
config(['$routeProvider', function($routeProvider, $locationProvider) {
    //$locationProvider.hashPrefix('');
    $routeProvider.otherwise({redirectTo: '/home'});
}])
.config(function (localStorageServiceProvider) {
  localStorageServiceProvider
    .setPrefix('myApp')
    .setStorageType('sessionStorage')
    .setNotify(true, true);
});
myApp
    .directive('bsActiveLink', ['$location', function ($location) {
    return {
        restrict: 'A', //use as attribute 
        replace: false,
        link: function (scope, elem) {
            //after the route has changed
            scope.$on("$routeChangeSuccess", function () {
                console.log("something");
                var hrefs = ['/#' + $location.path(),
                             '#' + $location.path(), //html5: false
                             $location.path()]; //html5: true
                angular.forEach(elem.find('a'), function (a) {
                    a = angular.element(a);
                    if (-1 !== hrefs.indexOf(a.attr('href'))) {
                        a.parent().addClass('active');
                    } else {
                        a.parent().removeClass('active');   
                    };
                });     
            });
        }
    }
}]);
  
myApp.controller('NavBarCtrl', function($scope){
   $scope.isCollapsed = true;
});
 





