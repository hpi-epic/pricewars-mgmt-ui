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
              $scope.consumer.consumer_url        = "http://vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de/";
              $scope.consumer.name                = "Consumer der Erste";
              $scope.consumer.description         = "Cooler Consumer doing Work";

              $scope.merchant                     = {};
              $scope.merchant.merchant_url        = "http://vm-mpws2016hp1-06.eaalab.hpi.uni-potsdam.de/";
              $scope.merchant.marketplace_url     = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de/marketplace/";
              $scope.merchant.name                = "Merchant der Erste";
              $scope.merchant.description         = "Cooler Merchant doing Work";
              $scope.merchant.nextState           = "init";

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
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
