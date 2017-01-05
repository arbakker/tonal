'use strict';

angular.module('myApp.radio', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/radiostations', {
    templateUrl: 'radiostations/radio.html',
    controller: 'RadioController'
  });
}])

 .controller('RadioController', function($scope, $http, $routeParams,PlayerService,NotifyingService,AuthService){
    $scope.PlayerService= PlayerService;
    $scope.artist=$routeParams.artistName;
    $scope.AuthService=AuthService;
    $scope.$watch('search', function() {
        if ($scope.AuthService.authenticated){
               fetch();
           }
    });
	NotifyingService.subscribeAuthenticated($scope, function somethingChanged() {
        fetch();
    });
	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/radiostations")
		           .then(function(response){ 
				   $scope.stations = response.data});
		         }

 });
