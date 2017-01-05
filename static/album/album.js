'use strict';

angular.module('myApp.album', ['ngRoute'])

.config(['$routeProvider', function($routeProvider, AuthService) {
  $routeProvider.when('/artist/:artistName/:album', {
    templateUrl: 'album/album.html',
    resolve:{
      'MyServiceData':function(AuthService){
        // MyServiceData will also be injectable in your controller, if you don't want this you could create a new promise with the $q service
        return AuthService.promise;
      }
    },
    controller: 'AlbumController',
  });
}])
 .controller('AlbumController', function($scope, $http, $routeParams, PlayerService, AuthService,NotifyingService){
    $scope.PlayerService= PlayerService;
    $scope.AuthService= AuthService;
    $scope.AuthService.authenticated=AuthService.getAuthenticated();
    $scope.artist=$routeParams.artistName;
    

    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
           }
    });
    NotifyingService.subscribeAuthenticated($scope, function somethingChanged() {
        fetch();
    });

    function fetch(){
        console.log("fetch");
        $http.get("http://localhost:5000/api/v1.0/artists/" + $routeParams.artistName + "/" + $routeParams.album)
        .then(function(response){ 
		    $scope.album = response.data.album;
        });
   }
   
 });
