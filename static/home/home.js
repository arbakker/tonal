'use strict';

angular.module('myApp.home', ['ngRoute'])

.config(['$routeProvider', function($routeProvider, AuthService) {
  $routeProvider.when('/home', {
    templateUrl: 'home/home.html',
    resolve:{
      'MyServiceData':function(AuthService){
        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
        return AuthService.promise;
      }
    },
    controller: 'LatestMusicController'
  });
   $routeProvider.when('/albums', {
    templateUrl: 'home/home.html',
    controller: 'MusicController'
  });
}])
 .controller('LatestMusicController', function($scope, $http, NotifyingService, AuthService){
    $scope.title="Latest Music";
    $scope.AuthService= AuthService;
    $scope.AuthService.authenticated=AuthService.getAuthenticated();
    
    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
           }
    });
    
    NotifyingService.subscribeAuthenticated($scope, function somethingChanged() {
        fetch();
    });

   function fetch(){
           $http.get("http://localhost:5000/api/v1.0/albums?sort=latest")
           .then(function(response){ 
           $scope.albums = response.data.albums; });
         }

 })
 .controller('MusicController', function($scope, $http,NotifyingService,AuthService){
    $scope.title="All Music";
    $scope.AuthService=AuthService;

    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
           }
    });
    
    NotifyingService.subscribeAuthenticated($scope, function somethingChanged() {
        fetch();
    });
         function fetch(){
                   $http.get("http://localhost:5000/api/v1.0/albums")
                   .then(function(response){ 
                   $scope.albums = response.data.albums; });
                 }

 })
 ;