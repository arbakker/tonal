'use strict';


angular.module('myApp.artist', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artist/:artistName', {
    templateUrl: 'artist/artist.html',
    controller: 'SingleArtistController'
  });
}])

 .controller('SingleArtistController', function($scope, $http, $routeParams,NotifyingService,AuthService ){
    $scope.artist=$routeParams.artistName;
    $scope.AuthService= AuthService;
    
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
                console.log("artist name" + $routeParams.artistName);
		           $http.get("http://localhost:5000/api/v1.0/artists/" + $routeParams.artistName)
		           .then(function(response){ 
				   $scope.albums = response.data.albums});
		         }

 });
