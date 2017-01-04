'use strict';

angular.module('myApp.album', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artist/:artistName/:album', {
    templateUrl: 'album/album.html',
    controller: 'AlbumController'
  });
}])
 .controller('AlbumController', function($scope, $http, $routeParams, PlayerService){
    $scope.PlayerService= PlayerService;
    $scope.artist=$routeParams.artistName;
	$scope.$watch('search', function() {
		           fetch();
		         });

	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/artists/" + $routeParams.artistName + "/" + $routeParams.album)
		           .then(function(response){ 
				   $scope.album = response.data.album;
                });
		         }

 });
