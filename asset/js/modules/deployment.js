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
              $scope.consumer_url                 = "http://192.168.2.4:8080";
              $scope.consumer.marketplace_url     = "http://192.168.2.1:8080";
              $scope.consumer.tick                = 1;
              $scope.consumer.amount_of_consumers = 10;
              $scope.consumer.probability_of_sell = 50;
              $scope.consumer.behaviors           = [{"name":"cheap","amount":20},
                                                    {"name":"expensive","amount":20},
                                                    {"name":"cheap_and_prime","amount":20},
                                                    {"name":"random","amount":20},
                                                    {"name":"first","amount":20}];
              $scope.merchant                     = {};
              $scope.merchant_url                 = "http://192.168.2.4:8080";
              $scope.merchant.marketplace_url     = "http://192.168.2.1:8080";
              $scope.merchant.tick                = 1;


              $scope.executeConsumer = function(){
                $http({url: $scope.consumer_url + "/setting",
                      dataType: "json",
                      method: "POST",
                      data: $scope.consumer,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Consumer was successfully deployed.");
                    });
              }

              $scope.terminateConsumer = function(){
                $http({url: $scope.consumer_url + "/setting",
                      dataType: "json",
                      method: "DELETE",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.danger("Consumer was successfully terminated.");
                    });
              }

              $scope.executeConsumer = function(){
                $http({url: $scope.merchant_url + "/setting",
                      dataType: "json",
                      method: "POST",
                      data: $scope.merchant,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Merchant was successfully deployed.");
                    });
              }

              $scope.terminateConsumer = function(){
                $http({url: $scope.merchant_url + "/setting",
                      dataType: "json",
                      method: "DELETE",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.danger("Merchant was successfully terminated.");
                    });
              }

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
