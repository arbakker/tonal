'use strict';

angular.module('myApp.artists', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artists', {
    templateUrl: 'artists/artists.html',
    controller: 'ArtistsController'
  });
}])

 .controller('ArtistsController', function($scope, $http){
	$scope.$watch('search', function() {
		           fetch();
		         });

	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/artists")
		           .then(function(response){ 
				   $scope.artists = response.data.albumartists; });
		         }

 });
