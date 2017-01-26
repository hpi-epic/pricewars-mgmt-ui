(function () {
    var co = angular.module('config', ['ngCookies']);

    co.controller('ngviewController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore',
        function ($routeParams, $location, $http, $scope, $cookieStore) {

            $scope.$on('$viewContentLoaded', function() {
                    //at_reload();
            });
        }] //END: controller function
    );  // END: ngviewController

    co.controller('globalCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints) {

              // $scope.consumer_per_minute          = 30.0;
              $scope.max_updates_per_sale         = 20.0;
              $scope.max_req_per_sec              = 0;
              $scope.updateMaxReqPerSec           = () => {
                // $scope.max_req_per_sec = $scope.max_updates_per_sale * ($scope.consumer_per_minute / 60)
                // if (!$scope.max_req_per_sec) {
                //   $scope.max_req_per_sec = 0
                // }
              }

              $scope.consumer                     = {};
              $scope.consumer_url                 = endpoints.consumer_url;
              $scope.marketplace_url              = endpoints.marketplace_url;
              $scope.merchants                    = merchants.get();

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000"
              };

              $scope.getMarketplaceSettings = function(){
                $http.get($scope.marketplace_url + "/config")
                    .then(function(response) {
                        $scope.marketplace     = response.data;
                        // $scope.consumer_per_minute  = response.data.consumer_per_minute;
                        $scope.max_updates_per_sale = response.data.max_updates_per_sale;
                        $scope.max_req_per_sec = response.data.max_req_per_sec;
                        // $scope.updateMaxReqPerSec();
                    });
              };

              $scope.getConsumerSettings = function() {
                  $http.get($scope.consumer_url + "/setting")
                      .then(function(response) {
                            $scope.consumer = response.data;
                  });
              };

              /*$scope.getMerchantSettings = function(url){
                $http.get(url + "/settings")
                    .then(function(response) {
                        $scope.merchants[url]  = response.data;
                    });
              };*/

              $scope.getSettings = function(){
                $http.get($scope.marketplace_url + "/merchants")
                    .then(function(response) {
                        $scope.getConsumerSettings();
                        $scope.getMarketplaceSettings();
                    });
              };

              $scope.updateConsumerSettings = function(){
                $scope.consumer.consumer_per_minute    = $scope.consumer_per_minute;
                $scope.consumer.max_req_per_sec        = $scope.max_req_per_sec;
                $http({url: $scope.consumer_url + "/setting",
                      dataType: "json",
                      method: "DELETE",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.warning("Consumer was successfully stopped.");
                });
                $http({url: $scope.consumer_url + "/setting",
                      dataType: "json",
                      method: "POST",
                      data: $scope.consumer,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                          toastr.success("Consumer was successfully started.");
                });
              };

              $scope.updateMerchantSettings = function(id, settings){
                let url = $scope.merchants.get(id).api_endpoint_url;
                settings.max_req_per_sec = $scope.max_req_per_sec;
                $http({url: url + "/settings",
                      dataType: "json",
                      method: "PUT",
                      data: settings,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                          toastr.success("Merchant settings were successfully updated.");
                });
              };

              $scope.updateMarketplaceConfig = function(){
                $http({url: $scope.marketplace_url + "/config",
                      dataType: "json",
                      method: "PUT",
                      data: {
                        // "consumer_per_minute": $scope.consumer_per_minute,
                        "max_req_per_sec": $scope.max_req_per_sec,
                        "max_updates_per_sale": $scope.max_updates_per_sale
                      },
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                          toastr.success("Marketplace config was successfully altered.");
                });
              };

              $scope.updateGlobalConfig = function(){
                $scope.updateConsumerSettings();
                $scope.updateMarketplaceConfig();
                angular.forEach($scope.merchants, function(value, key) {
                    $scope.updateMerchantSettings(key, value);
                });
              }
              $scope.getSettings();
            }] //END: controller function
          );  // END: dashboardController


          co.controller('consumerCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, endpoints) {

              $scope.consumer                     = {};
              $scope.consumer_url                 = endpoints.consumer_url;

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000"
              };

              $scope.getConsumerSettings = function() {
                  $http.get($scope.consumer_url + "/setting/")
                      .then(function(response) {
                              $scope.consumer = response.data;
                              $scope.consumer.marketplace_url     = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";
                          });
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

              $scope.getConsumerSettings();

            }] //END: controller function
          );  // END: dashboardController

          co.controller('merchantCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints) {

              $scope.marketplace_url              = endpoints.marketplace_url;
              $scope.merchants                    = merchants.get();

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000"
              };

              $scope.findMerchantNameById = function(merchant_id) {
                  return merchants.getMerchantName(merchant_id);
              };

              $scope.startMerchant = function(merchant_id){
                $http({url: $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: {"nextState":"start"},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Merchant was successfully started.");
                            merchants.updateMerchants();
                    });
              };

              $scope.terminateMerchant = function(merchant_id){
                $http({url: $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: {"nextState":"kill"},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.warning("Merchant was successfully terminated.");
                            merchants.updateMerchants();
                    });
              };

              $scope.stopMerchant = function(merchant_id){
                $http({url: $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings/execution",
                      dataType: "json",
                      method: "POST",
                      data: {"nextState":"stop"},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.warning("Merchant was successfully stopped.");
                            merchants.updateMerchants();
                    });
              };

              $scope.updateMerchantSettings = function(merchant_id){
                $http({url: $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings",
                      dataType: "json",
                      method: "PUT",
                      data: $scope.merchants[merchant_id],
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Merchant was successfully updated.");
                            merchants.updateMerchants();
                    });
              };

              $scope.deleteMerchant = function(merchant_id){
                $http({url: $scope.marketplace_url + "/merchants/"+merchant_id,
                      dataType: "json",
                      method: "DELETE",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Merchant was successfully deleted.");
                            merchants.updateMerchants();
                    });
              };

            }] //END: controller function
    );  // END: dashboardController

    co.controller('producerCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, endpoints) {

              $scope.marketplace_url              = endpoints.marketplace_url;
              $scope.producer_url                 = endpoints.producer_url;
              $scope.producer                     = {};
              $scope.new_product                  = {"uid":0,"product_id":0,"name":"Name","quality":0,"price":0};

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000"
              };

              $scope.getProducts = function(){
                $http.get($scope.producer_url + "/products/")
                    .then(function(response) {
                        $scope.producer = response.data;
                    });
              };

              $scope.updateProducts = function(){
                $http({url: $scope.producer_url + "/products/",
                      dataType: "json",
                      method: "PUT",
                      data: $scope.producer,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Products were successfully updated.");
                            $scope.getProducts();
                    });
              };

              $scope.updateProduct = function(product_uid){
                $http({url: $scope.producer_url + "/products/"+ product_uid,
                      dataType: "json",
                      method: "PUT",
                      data: [ $filter('filter')($scope.producer, {uid:product_uid})[0] ],
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Product was successfully updated.");
                            $scope.getProducts();
                    }).error(function (error) {
                            toastr.warning(error.message);
                    });
              };

              $scope.deleteProduct = function(uid){
                $http({url: $scope.producer_url + "/products/"+ uid,
                      dataType: "json",
                      method: "DELETE",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Products was successfully deleted.");
                            $scope.getProducts();
                    });
              };

              $scope.createProduct = function(){
                $http({url: $scope.producer_url + "/products/",
                      dataType: "json",
                      method: "POST",
                      data: [ $scope.new_product ],
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Product was successfully created.");
                            $scope.getProducts();
                            $("#newProductModal").modal("hide");
                    });
              };

              $scope.new = function(){
                $("#newProductModal").modal("show");
              };

              $scope.close = function(){
                $("#newProductModal").modal("hide");
              };

              $scope.getProducts();

            }] //END: controller function
    );  // END: dashboardController

    co.controller('marketplaceCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, $timeout, merchants, endpoints) {

              $scope.marketplace_url              = endpoints.marketplace_url;
              $scope.producer_url                 = endpoints.producer_url;
              $scope.offers                       = {};
              $scope.products                     = {};
              $scope.merchants                    = merchants.get();
              $scope.updateInterval               = 1000;
              $scope.offerPullTimeout             = 0;

                let timeoutCancelled = false;

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
              };

              $scope.getOffers = function(){
                $http.get($scope.marketplace_url + "/offers")
                    .then(function(response) {
                        $scope.offers = response.data;

                        // sort the offers by product_uid
                        $scope.offers.sort(function(a, b){
                            if(a.uid < b.uid) return -1;
                            if(a.uid > b.uid) return 1;
                            return 0;
                        });

                        if (!timeoutCancelled) $scope.offerPullTimeout = $timeout($scope.getOffers, $scope.updateInterval);
                    });
              };

              $scope.getOffers();

              $scope.$on('$locationChangeStart', function() {
                  timeoutCancelled = true;
                  $timeout.cancel($scope.offerPullTimeout);
              });

              $scope.getProductInfo = function(){
                    $http.get($scope.producer_url + "/products/")
                        .then(function(response) {
                            for (var key in response.data) {
                                var product = response.data[key];
                                $scope.products[product["uid"]] = product;
                                delete($scope.products[product["uid"]].uid);
                            }
                        });
               };

               $scope.getProductInfo();

               $scope.updateKey = function(){
                 $http({url: $scope.marketplace_url + "/producer/key",
                       dataType: "json",
                       method: "PUT",
                       data: {},
                       headers: {
                           "Content-Type": "application/json"
                       }
                     }).success(function (data) {
                             toastr.success("New key was fetched.");
                     });
               };

               $scope.findNameOfProduct = function(productUID) {
                   if ($scope.products[productUID])
                     return $scope.products[productUID].name;
                   return "No longer available";
               };

                $scope.findMerchantNameById = function(id){
                    return merchants.getMerchantName(id);
                };

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
