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

              $scope.max_req_per_sec              = 0;
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
                $http({
                  url: "/request",
                  params: {"url": $scope.marketplace_url + "/config"}
                }).then(function(response) {
                  $scope.max_req_per_sec = response.data.max_req_per_sec;
                });
              };

              $scope.updateMerchantSettings = function(id, settings){
                let url = $scope.merchants.get(id).api_endpoint_url;
                settings.max_req_per_sec = $scope.max_req_per_sec;
                $http({url: "/request",
                      params: {"url": url + "/settings"},
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
                $http({url: "/request",
                      params: {"url": $scope.marketplace_url + "/config"},
                      dataType: "json",
                      method: "PUT",
                      data: {
                        "max_req_per_sec": $scope.max_req_per_sec
                      },
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                          toastr.success("Marketplace config was successfully altered.");
                });
              };

              $scope.updateGlobalConfig = function(){
                $scope.updateMarketplaceConfig();
                angular.forEach($scope.merchants, function(value, key) {
                    $scope.updateMerchantSettings(key, value);
                });
              }
              endpoints.getData().then(function(urls){
                $scope.marketplace_url= urls.marketplace_url;
                $scope.producer_url   = urls.producer_url;
                $scope.getMarketplaceSettings();
              });
            }] //END: controller function
          );  // END: dashboardController


          co.controller('consumerCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, endpoints) {

              $scope.consumer                     = {};
              $scope.purchases_per_minute         = 0;

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000"
              };

              $scope.translate_purchase_per_minute = function(){
                $scope.consumer.amount_of_consumers = Math.ceil($scope.purchases_per_minute/100);
                if($scope.consumer.amount_of_consumers<1){
                  $scope.consumer.amount_of_consumers=1;
                }
                $scope.consumer.consumer_per_minute = Math.ceil($scope.purchases_per_minute/$scope.consumer.amount_of_consumers);
                $scope.consumer.probability_of_buy = 100;
              };

              $scope.getConsumerSettings = function() {
                $http({
                  url: "/request",
                  params: {"url": $scope.consumer_url + "/setting/"}
                }).then(function(response) {
                  $scope.consumer = response.data;
                  $scope.purchases_per_minute = ($scope.consumer.amount_of_consumers*$scope.consumer.consumer_per_minute*$scope.consumer.probability_of_buy)/100;
                });
              };

              $scope.updateConsumerProductSettings = function() {
                $http({url: "/request",
                      params: {"url": $scope.consumer_url + "/setting/products"},
                      dataType: "json",
                      method: "POST",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            console.log(data);
                  });
              };

              $scope.updateConsumer = function(){
                $scope.updateConsumerProductSettings();
                $http({url: "/request",
                      params: {"url": $scope.consumer_url + "/setting"},
                      dataType: "json",
                      method: "PUT",
                      data: $scope.consumer,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Consumer was successfully updated.");
                    });
              };

              $scope.executeConsumer = function(){
                $http({url: "/request",
                      params: {"url": $scope.consumer_url + "/setting"},
                      dataType: "json",
                      method: "POST",
                      data: $scope.consumer,
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Consumer was successfully deployed.");
                    });
              };

              $scope.terminateConsumer = function(){
                $http({url: "/request",
                      params: {"url": $scope.consumer_url + "/setting"},
                      dataType: "json",
                      method: "DELETE",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.warning("Consumer was successfully terminated.");
                    });
              };

                $scope.unregisterConsumer = function(){
                    $http({url: "/request",
                        params: {"url": $scope.consumer_url + "/register"},
                        dataType: "json",
                        method: "DELETE",
                        data: {},
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }).success(function (data) {
                        toastr.warning("Consumer was successfully unregistered.");
                    });
                };

              $scope.objectToString = function(object){
                return JSON.stringify(object);
              };

              endpoints.getData().then(function(urls){
                $scope.consumer_url   = urls.consumer_url;
                $scope.marketplace_url= urls.marketplace_url;
                $scope.getConsumerSettings();
              });
            }] //END: controller function
          );  // END: dashboardController

          co.controller('merchantCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints) {

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
                $http({url: "/request",
                      params: {"url": $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings/execution"},
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
                $http({url: "/request",
                      params: {"url": $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings/execution"},
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
                $http({url: "/request",
                      params: {"url": $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings/execution"},
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
                // Also send the new holding cost rate to the marketplace.
                $http({url: "/request",
                      params: {"url": $rootScope.urls.marketplace_url + "/holding_cost_rate"},
                      dataType: "json",
                      method: "PUT",
                      data: {
                        "rate": $scope.merchants[merchant_id]["holding_cost_rate"],
                        "merchant_id": merchant_id
                      },
                      headers: {
                          "Content-Type": "application/json"
                      }
                    });

                $http({url: "/request",
                      params: {"url": $scope.merchants[merchant_id]["api_endpoint_url"] + "/settings"},
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
                $http({url: "/request",
                      params: {"url": $scope.marketplace_url + "/merchants/"+merchant_id},
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

            $scope.productsInfo = {};
            $scope.newProductInfo = {
                'product_id': 0,
                'name': 'Product Name',
                'qualities': [1, 2, 3, 4],
                'unit_price': 0,
                'fixed_order_cost': 0,
                'stock': -1,
                'time_to_live': -1,
                'start_of_lifetime': -1
            };

            toastr.options = {
                'debug': false,
                'newestOnTop': false,
                'positionClass': 'toast-top-center',
                'closeButton': true,
                'toastClass': 'animated fadeInDown',
                'timeOut': '2000'
            };

            $scope.getProducts = function() {
                $http({
                    url: '/request',
                    params: {'url': $scope.producer_url + '/products'}
                }).then(function (response) {
                    $scope.productsInfo = response.data;
                });
            };

            $scope.updateProduct = function(id) {
                $http({
                    url: '/request',
                    params: {'url': $scope.producer_url + '/products/' + id},
                    dataType: 'json',
                    method: 'PUT',
                    data: $filter('filter')($scope.productsInfo, {product_id: id})[0],
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).success(function() {
                    toastr.success('Product was successfully updated.');
                    $scope.getProducts();
                }).error(function (error) {
                    toastr.warning(error.message);
                });
            };

            $scope.deleteProduct = function(id) {
                $http({
                    url: '/request',
                    params: {'url': $scope.producer_url + '/products/' + id},
                    dataType: 'json',
                    method: 'DELETE',
                    data: {},
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).success(function() {
                    toastr.success('Products was successfully deleted.');
                    $scope.getProducts();
                }).error(function (error) {
                    toastr.warning(error.message);
                });
            };

            $scope.createProduct = function() {
                $http({
                    url: '/request',
                    params: {'url': $scope.producer_url + '/products/'},
                    dataType: 'json',
                    method: 'POST',
                    data: $scope.newProductInfo,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).success(function() {
                    toastr.success('Product was successfully created.');
                    $scope.getProducts();
                    $scope.closeNewProductModal()
                }).error(function (error) {
                    toastr.warning(error.message);
                });
            };

            $scope.openNewProductModal = function() {
                $('#newProductModal').modal('show');
            };

            $scope.closeNewProductModal = function() {
                $('#newProductModal').modal('hide');
            };

            endpoints.getData().then(function(urls) {
                $scope.producer_url = urls.producer_url;
                $scope.getProducts();
            });

        }] //END: controller function
    );  // END: dashboardController

    co.controller('marketplaceCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, $timeout, merchants, endpoints) {

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
                  "timeOut": "2000"
              };

              $scope.getOffers = function(){
                $http({
                  url: "/request",
                  params: {"url": $scope.marketplace_url + "/offers"}
                }).then(function(response) {
                        $scope.offers = response.data;

                        // sort the offers by product_uid
                        $scope.offers.sort(function(a, b){
                            if (a.uid < b.uid) return -1;
                            else if (a.uid > b.uid) return 1;
                            else {
                                if(a.price < b.price) return -1;
                                if(a.price > b.price) return 1;
                            }
                            return 0;
                        });

                        if (!timeoutCancelled) $scope.offerPullTimeout = $timeout($scope.getOffers, $scope.updateInterval);
                    });
              };



              $scope.$on('$locationChangeStart', function() {
                  timeoutCancelled = true;
                  $timeout.cancel($scope.offerPullTimeout);
              });

              $scope.getProductInfo = function(){
                $http({
                  url: "/request",
                  params: {"url": $scope.producer_url + "/products?showDeleted=true"}
                }).then(function(response) {
                  for (var key in response.data) {
                      var product = response.data[key];
                      $scope.products[product["uid"]] = product;
                      delete($scope.products[product["uid"]].uid);
                  }
                });
              };

               endpoints.getData().then(function(urls){
                 $scope.consumer_url   = urls.consumer_url;
                 $scope.marketplace_url= urls.marketplace_url;
                 $scope.producer_url   = urls.producer_url;
                 $scope.getProductInfo();
                 $scope.getOffers();
               });

               $scope.updateKey = function(){
                 $http({url: "/request",
                       params: {"url": $scope.marketplace_url + "/producer/key"},
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
