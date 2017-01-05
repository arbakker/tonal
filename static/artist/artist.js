'use strict';

angular.module('myApp.artist', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artist/:artistName', {
    templateUrl: 'artist/artist.html',
    controller: 'SingleArtistController'
  });
}])

 .controller('SingleArtistController', function($scope, $http, $routeParams,NotifyingService){
    $scope.artist=$routeParams.artistName;
	NotifyingService.subscribeAuthenticated($scope, function somethingChanged() {
        fetch();
    });
	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/artists/" + $routeParams.artistName)
		           .then(function(response){ 
				   $scope.albums = response.data.albums});
		         }

 });
