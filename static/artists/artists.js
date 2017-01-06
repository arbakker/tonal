'use strict';

angular.module('myApp.artists', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artists', {
    templateUrl: 'artists/artists.html',
    controller: 'ArtistsController'
  });
}])

 .controller('ArtistsController', function($scope, $http,NotifyingService,AuthService){
    
    $scope.AuthService=AuthService;
    
    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
           }
           else{
              $scope.AuthService.tokenValidate();
           }
    });
	NotifyingService.subscribeAuthenticated($scope, function somethingChanged() {
        fetch();
    });
  NotifyingService.subscribeAuthenticatedInit($scope, function initAuthenticated() {
        fetch();
    });

	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/artists")
		           .then(function(response){ 
				   $scope.artists = response.data.albumartists; });
		         }

 });
