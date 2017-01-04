'use strict';

var myApp = angular.module('myApp');

myApp.service('AuthService', function($http, $window,$base64) {
  var myAuth = {
    user: {username: 'admin', password: 'default'},
    message: '',
    authenticated: false,
    submit: function(){
      var url="http://localhost:5000/api/v1.0/token";
      var user=myAuth.user;
      var auth = $base64.encode(user.username + ":" + user.password);
      var headers = {"Authorization": "Basic " + auth};
      $http.get(url, {headers: headers})
      .success(function (data, status, headers, config) {
        $window.sessionStorage.token = data.token;
        myAuth.message = 'Welcome ' + user.username;
        myAuth.authenticated=true;
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        delete $window.sessionStorage.token;
        myAuth.authenticated=false;
        // Handle login errors here
        myAuth.message = 'Error: Invalid user or password';
      });
    }
  }
  return myAuth;
});


myApp.directive('myAuth', function(AuthService) {
  return {
      restrict: "E",
      scope: {},
      templateUrl: "./auth/auth.html",
      link: function (scope, element, attrs) {
        scope.myAuthService = AuthService;
      }
    }
  });


myApp.controller('AuthController', ['$scope','$http','$window','$base64', function($scope,$http, $window,$base64) {
    $scope.user = {username: 'admin', password: 'default'};
    $scope.message = '';
  $scope.submit = function () {
      var url="http://localhost:5000/api/v1.0/token";
      var user=$scope.user;
      var auth = $base64.encode(user.username + ":" + user.password);
      var headers = {"Authorization": "Basic " + auth};
      $http.get(url, {headers: headers})
      .success(function (data, status, headers, config) {
        $window.sessionStorage.token = data.token;
        $scope.message = 'Welcome';
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        delete $window.sessionStorage.token;
        // Handle login errors here
        $scope.message = 'Error: Invalid user or password';
      });
    }
}]);

myApp.factory('authInterceptor',['$rootScope', '$q', '$window','$base64', function ($rootScope, $q, $window, $base64) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        if (!config.headers.hasOwnProperty('Authorization')){
          config.headers['Authorization'] = "Token " + $window.sessionStorage.token;
          /*console.log("Header Authorization not set");
          var auth = $base64.encode($window.sessionStorage.token + ":" + "");
          var headers = {"Authorization": "Basic " + auth};
          config.headers=headers;*/
        }else{
          console.log("Header Authorization set");
        }
      }
      return config;
    },
    response: function (response) {
      if (response.status === 401) {
        // handle the case where the user is not authenticated

      }
      return response || $q.when(response);
    }
  };
}]);

myApp.config(['$httpProvider',function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
}]);
