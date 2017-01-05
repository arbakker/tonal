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
  'myApp.album',
  'myApp.radio',
  'angularModalService',
  'ngAnimate'
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
myApp.directive('bsActiveLink', ['$location','NotifyingService', function ($location,NotifyingService) {
    return {
        restrict: 'A', //use as attribute 
        replace: false,
        link: function (scope, elem) {
            //after the route has changed
            var routeChange=function () {
              var hrefs = ['/#' + $location.path(),
                             '#' + $location.path(), //html5: false
                             $location.path()]; //html5: true
              angular.forEach(elem.find('a'), function (a) {
                a = angular.element(a);
                if (-1 !== hrefs.indexOf(a.attr('href'))) {
                  a.parent().addClass('active');
                } else {
                  a.parent().removeClass('active');   
                }
              });     
            }
            scope.$on('$locationChangeStart', function(event) {
              routeChange();
            });
            routeChange();
        }
    }
}]);
  
myApp.controller('NavBarCtrl', function($scope, AuthService){
   $scope.AuthService= AuthService;
   $scope.check = function() {
    var visible=$("#myNavBarButton").is(":visible");
    console.log(visible);
    if (visible) {
        $scope.isCollapsed=!$scope.isCollapsed;
    }
}
   $scope.isCollapsed = true;
});
 





