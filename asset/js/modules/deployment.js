(function () {
    var ana = angular.module('deployment', ['ngCookies']);

    ana.controller('ngviewController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore',
        function ($routeParams, $location, $http, $scope, $cookieStore) {

            $scope.$on('$viewContentLoaded', function() {
                    //at_reload();
            });
        }] //END: controller function
    );  // END: ngviewController

    ana.controller('deploymentCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.consumer                     = {};
              $scope.consumer.consumer_url        = "http://192.168.2.4:8080";
              $scope.consumer.name                = "Consumer der Erste";
              $scope.consumer.description         = "Cooler Consumer doing Work";

              $scope.merchant                     = {};
              $scope.merchant.merchant_url        = "http://192.168.2.4:8080";
              $scope.merchant.name                = "Consumer der Erste";
              $scope.merchant.description         = "Cooler Consumer doing Work";
              $scope.merchant.nextState           = "init";

              $scope.registerConsumer = function(){
                $http({url: $scope.consumer.consumer_url + "/register",
                      dataType: "json",
                      method: "POST",
                      data: $scope.consumer,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Consumer was successfully registered.");
                    });
              }

              $scope.registerMerchant = function(){
                $http({url: $scope.merchant.merchant_url + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: $scope.merchant,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Consumer was successfully registered.");
                    });
              }


            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
