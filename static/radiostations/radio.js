'use strict';

angular.module('myApp.artist', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/radiostations', {
    templateUrl: 'radiostations/radio.html',
    controller: 'RadioController'
  });
}])

 .controller('RadioController', function($scope, $http, $routeParams,PlayerService){
    $scope.PlayerService= PlayerService;
    $scope.artist=$routeParams.artistName;
	$scope.$watch('search', function() {
		           fetch();
		         });

	     function fetch(){
		           $http.get("http://localhost:5000/api/v1.0/radiostations")
		           .then(function(response){ 
				   $scope.stations = response.data});
		         }

 });
