'use strict';

angular.module('myApp.home', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/home', {
      templateUrl: 'home/home.html',
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
    
    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
        }
          else{
              $scope.AuthService.tokenValidate();
           }
    });

    NotifyingService.subscribeAuthenticatedInit($scope, function initAuthenticated() {
        fetch();
    });
    
    NotifyingService.subscribeAuthenticated($scope, function authenticated() {
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
           else{
              $scope.AuthService.tokenValidate();
           }
    });
    NotifyingService.subscribeAuthenticatedInit($scope, function initAuthenticated() {
        fetch();
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