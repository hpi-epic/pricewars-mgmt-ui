(function () {
    var ana = angular.module('deployment', ['ngCookies']);

    ana.controller('ngviewController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore',
        function ($routeParams, $location, $http, $scope, $cookieStore) {

            $scope.$on('$viewContentLoaded', function() {
                    //at_reload();
            });
        }] //END: controller function
    );  // END: ngviewController

    ana.controller('deploymentCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', 'endpoints', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, endpoints, $rootScope) {

              $scope.consumer                     = {};
              $scope.consumer.name                = "";
              $scope.consumer.description         = "";

              $scope.merchant                     = {};
              $scope.merchant.api_endpoint_url    = "";
              $scope.merchant.merchant_name       = "";
              $scope.merchant.algorithm_name      = "";
              $scope.merchant.nextState           = "init";

              endpoints.getData().then(function(urls){
                 $scope.consumer.consumer_url   = urls.consumer_url;
                 $scope.marketplace_url         = urls.marketplace_url;
                 $scope.producer_url            = urls.producer_url;
                 $scope.merchant.marketplace_url= urls.marketplace_url;
              });

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000"
              };

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
                $http({url: $scope.merchant.marketplace_url + "/merchants",
                      dataType: "json",
                      method: "POST",
                      data: $scope.merchant,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                      $scope.merchant.merchant_token = data.merchant_token;
                      $scope.merchant.merchant_id = data.merchant_id;
                      toastr.success("Merchant was successfully registered.");
                    });
              }

              $scope.unregisterMerchant = function(){
                $http({url: $scope.merchant.marketplace_url + "/merchants/token/" + $scope.merchant.merchant_token_input,
                      method: "DELETE",
                      headers: {
                      }
                    }).success(function (data) {
                      $scope.merchant.merchant_token = null;
                      $scope.merchant.merchant_token_input = null;
                      toastr.success("Merchant was successfully deleted and the token revoked!");
                    });
              }

              $scope.updateMerchant = function(){
                $http({url: $scope.merchant.marketplace_url + "/merchants/token/" + $scope.merchant.merchant_token_input,
                      method: "PUT",
                      data: $scope.merchant,
                      headers: {
                        "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                      $scope.merchant.merchant_token = null;
                      $scope.merchant.merchant_token_input = null;
                      toastr.success("Merchant was successfully updated!");
                    });
              }

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
