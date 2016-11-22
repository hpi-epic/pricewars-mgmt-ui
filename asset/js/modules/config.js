(function () {
    var co = angular.module('config', ['ngCookies']);

    co.controller('ngviewController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore',
        function ($routeParams, $location, $http, $scope, $cookieStore) {

            $scope.$on('$viewContentLoaded', function() {
                    //at_reload();
            });
        }] //END: controller function
    );  // END: ngviewController

    co.controller('consumerCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.consumer                     = {};
              $scope.consumer_url                 = "http://vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de/";
              $scope.consumer.marketplace_url     = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de/marketplace/";
              $scope.consumer.tick                = 1;
              $scope.consumer.amount_of_consumers = 10;
              $scope.consumer.probability_of_sell = 50;
              $scope.consumer.behaviors           = [{"name":"cheap","amount":20},
                                                    {"name":"expensive","amount":20},
                                                    {"name":"cheap_and_prime","amount":20},
                                                    {"name":"random","amount":20},
                                                    {"name":"first","amount":20}];

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
              };

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
                            toastr.warning("Consumer was successfully terminated.");
                    });
              }

            }] //END: controller function
          );  // END: dashboardController

          co.controller('merchantCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.marketplace_url              = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de/marketplace/";
              $scope.merchantConfig               = {};

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
              };

              $scope.getMerchants = function(){
                $http.get($scope.marketplace_url + "merchants")
                    .then(function(response) {
                        $scope.merchants = response.data;
                        $scope.getDetails();
                    });
              }

              $scope.getDetails = function(){
                $scope.merchantDetails = {};

                angular.forEach($scope.merchants, function(value, key) {
                  $http.get(value["api_endpoint_url"] + "/settings")
                      .then(function(response) {
                          $scope.merchantDetails[value["merchant_id"]] = response.data;
                      });
                });
              }

              $scope.startMerchant = function(merchant_id){
                $http({url: $scope.merchantDetails[merchant_id]["ownEndpoint"] + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: {"nextState":"start"},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Merchant was successfully started.");
                    });
              }

              $scope.terminateMerchant = function(merchant_id){
                $http({url: $scope.merchantDetails[merchant_id]["ownEndpoint"] + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: {"nextState":"kill"},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.warning("Merchant was successfully terminated.");
                    });
              }

              $scope.stopMerchant = function(merchant_id){
                $http({url: $scope.merchantDetails[merchant_id]["ownEndpoint"] + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: {"nextState":"stop"},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.warning("Merchant was successfully stopped.");
                    });
              }

              $scope.updateMerchantSettings = function(merchant_id){
                $http({url: $scope.merchantDetails[merchant_id]["ownEndpoint"] + "/settings",
                      dataType: "json",
                      method: "PUT",
                      data: $scope.merchantDetails[merchant_id],
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Merchant was successfully stopped.");
                    });
              }

              $scope.getMerchants();

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
