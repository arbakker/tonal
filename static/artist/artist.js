'use strict';


angular.module('myApp.artist', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/artist/:artistName', {
    templateUrl: 'artist/artist.html',
    controller: 'SingleArtistController',
    resolve:{
      'MyServiceData':function(AuthService){
        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
        return AuthService.promise;
      }
    },
  });

}])

 .controller('SingleArtistController', function($scope, $http, $routeParams,NotifyingService,AuthService ){
    $scope.artist=$routeParams.artistName;
    $scope.AuthService= AuthService;
    $scope.AuthService.authenticated=AuthService.getAuthenticated();
    
    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
           }
    });
	
	     function fetch(){
                console.log("artist name" + $routeParams.artistName);
		           $http.get("http://localhost:5000/api/v1.0/artists/" + $routeParams.artistName)
		           .then(function(response){ 
				   $scope.albums = response.data.albums});
		         }

 });
