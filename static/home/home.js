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
 .controller('LatestMusicController', function($scope, $http){
    $scope.title="Latest Music";
	$scope.$watch('search', function() {
		           fetch();
		         });

	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/albums?sort=latest")
		           .then(function(response){ 
				   $scope.albums = response.data.albums; });
		         }

 })
 .controller('MusicController', function($scope, $http){
    $scope.title="All Music";
    $scope.$watch('search', function() {
                   fetch();
                 });

         function fetch(){
                   $http.get("http://localhost:5000/api/v1.0/albums")
                   .then(function(response){ 
                   $scope.albums = response.data.albums; });
                 }

 })
 ;
