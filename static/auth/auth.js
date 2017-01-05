'use strict';

var myApp = angular.module('myApp');

myApp.service('AuthService', function($http, $window,$base64,$q,NotifyingService) {
  var myAuth = {
    user: {username: 'admin', password: 'default'},
    message: '',
    authenticated: false,
    submit: function(){
      //var auth = $base64.encode(user.username + ":" + user.password);
      //var headers = {"Authorization": "Basic " + auth};
      var url="http://localhost:5000/api/v1.0/token";
      var user=myAuth.user;
      var data={'username':user.username,'password':user.password};
      $http.post(url, data)
      .success(function (data, status, headers, config) {
        $window.sessionStorage.token = data.access_token;
        myAuth.message = 'Welcome ' + user.username;
        myAuth.authenticated=true;
        NotifyingService.notifyAuthenticated();
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        delete $window.sessionStorage.token;
        myAuth.authenticated=false;
        NotifyingService.notifyNotAuthenticated();
        // Handle login errors here
        myAuth.message = 'Error: Invalid user or password';
      });
    }
  }
  return myAuth;
});


myApp.directive('myAuth', ['AuthService','NotifyingService', 'LoginModalService', function(AuthService, NotifyingService,LoginModalService) {
  return {
      restrict: "E",
      scope: true  ,
      templateUrl: "./auth/auth.html",
      link: function (scope, element, attrs) {
        scope.myAuthService = AuthService;
        scope.LoginModalService=LoginModalService;
        scope.yesNoResult="Not set";
        NotifyingService.subscribeAuthExpired(scope, function authExpired() {
          console.log('auth-expired-event received');
          scope.myAuthService.authenticated=false;
          scope.myAuthService.message="Your authentication token has expired.";
        });

      NotifyingService.subscribeNotAuthenticated(scope, function notAuthenticated() {
         LoginModalService.showLogin(scope)
      });

      NotifyingService.subscribeAuthExpired(scope, function authExpired() {     
         LoginModalService.showLogin(scope)
      });
      
      }
    }
  }]);

myApp.controller('YesNoController', ['$scope', 'close', 'AuthService','NotifyingService','LoginModalService', function($scope, close, AuthService, NotifyingService, LoginModalService) {
  $scope.myAuthService = AuthService;

  $scope.login = function(){
    $scope.myAuthService.submit();
  };
  $scope.close = function(result) {
    close(result, 0); // close, but give 500ms for bootstrap to animate
  };

}]);

myApp.service("LoginModalService", ['ModalService','AuthService', function(ModalService, AuthService){
  return{
        showLogin : function(scope) {
            ModalService.showModal({
              templateUrl: "auth/modal.html",
              controller: "YesNoController"
          }).then(function(modal) {
              modal.element.modal();
              modal.close.then(function(result) {
              scope.yesNoResult = result ? "You said Yes" : "You said No";
              });
          });
        }
  }      
}]);

myApp.service('NotifyingService', function($rootScope) {
    return {
        subscribeAuthenticated: function(scope, callback) {
            var handler = $rootScope.$on('authenticated-event', callback);
            scope.$on('$destroy', handler);
        },
        notifyAuthenticated: function() {
            $rootScope.$emit('authenticated-event');
        },
        subscribeNotAuthenticated: function(scope, callback) {
            var handler = $rootScope.$on('notAuthenticated-event', callback);
            scope.$on('$destroy', handler);
        },
        notifyNotAuthenticated: function() {
            $rootScope.$emit('notAuthenticated-event');
        },
        subscribeAuthExpired: function(scope, callback) {
            var handler = $rootScope.$on('auth-expired-event', callback);
            scope.$on('$destroy', handler);
        },
        notifyAuthExpired: function() {
            $rootScope.$emit('auth-expired-event');
        }
    };
});

myApp.factory('authInterceptor',['$rootScope', '$q', '$window','$base64','NotifyingService', function ($rootScope, $q, $window, $base64, NotifyingService) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        if (!config.url.endsWith('token')){
          config.headers['Authorization'] = "JWT " + $window.sessionStorage.token;
        }else{
          console.log("request for token, no JWT set");
        }
      }
      return config;
    },
    response: function (response) {
      return response || $q.when(response);
    },
    responseError: function(rejection){
      if (!rejection.config.url.endsWith('token')){
        console.log("intercepted");
        if (rejection.status===401) {
          NotifyingService.notifyAuthExpired();
        }
      }
      return $q.reject(rejection);
    }
  };
}]);

myApp.config(['$httpProvider',function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
}]);


