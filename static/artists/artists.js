'use strict';

angular.module('myApp.artists', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artists', {
    templateUrl: 'artists/artists.html',
    controller: 'ArtistsController',
    resolve:{
      'MyServiceData':function(AuthService){
        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
        return AuthService.promise;
      }
    }
  });
}])

 .controller('ArtistsController', function($scope, $http,NotifyingService,AuthService){
    
    $scope.AuthService=AuthService;
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
		           $http.get("http://localhost:5000/api/v1.0/artists")
		           .then(function(response){ 
				   $scope.artists = response.data.albumartists; });
		         }

 });
