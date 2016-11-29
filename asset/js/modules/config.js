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
              $scope.consumer_url                 = "http://vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de";
              $scope.consumer.marketplace_url     = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";
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

              $scope.marketplace_url              = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";
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
                $http.get($scope.marketplace_url + "/merchants")
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
                $http({url: $scope.merchantDetails[merchant_id]["merchant_url"] + "/settings/execution",
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
                $http({url: $scope.merchantDetails[merchant_id]["merchant_url"] + "/settings/execution",
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
                $http({url: $scope.merchantDetails[merchant_id]["merchant_url"] + "/settings/execution",
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
                $http({url: $scope.merchantDetails[merchant_id]["merchant_url"] + "/settings",
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

              $scope.deleteMerchant = function(merchant_id){
                $http({url: $scope.marketplace_url + "/merchants/"+merchant_id,
                      dataType: "json",
                      method: "DELETE",
                      data: {},
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

    co.controller('producerCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.marketplace_url              = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";
              $scope.producer_url                 = "http://vm-mpws2016hp1-03.eaalab.hpi.uni-potsdam.de";
              $scope.producer                     = {};
              $scope.new_product                  = {"uid":0,"product_id":0,"name":"Name","quality":0,"price":0};

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
              };

              $scope.getProducts = function(){
                $http.get($scope.producer_url + "/products/")
                    .then(function(response) {
                        $scope.producer = response.data;
                    });
              }

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
              }

              $scope.updateProduct = function(product_uid){
                $http({url: $scope.producer_url + "/products/"+ product_uid,
                      dataType: "json",
                      method: "PUT",
                      data: [ $filter('filter')($scope.producer["products"], {uid:product_uid})[0] ],
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                            toastr.success("Product was successfully updated.");
                            $scope.getProducts();
                    });
              }

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
              }

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
              }

              $scope.new = function(){
                $("#newProductModal").modal("show");
              }

              $scope.close = function(){
                $("#newProductModal").modal("hide");
              }

              $scope.getProducts();

            }] //END: controller function
    );  // END: dashboardController

    co.controller('marketplaceCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.marketplace_url              = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";
              $scope.producer_url                 = "http://vm-mpws2016hp1-03.eaalab.hpi.uni-potsdam.de";
              $scope.offers                       = {};
              $scope.producer                     = {};
              $scope.updateInterval               = 1000;

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
              };

              var runningUpdate ;
              $scope.getOffers = function(){
                $http.get($scope.marketplace_url + "/offers")
                    .then(function(response) {
                        $scope.offers = response.data;
                        setTimeout( $scope.getOffers, $scope.updateInterval);
                    });
              };


              $scope.getOffers();

              $scope.getProductInfo = function(){
                    $http.get($scope.producer_url + "/products/")
                        .then(function(response) {
                            $scope.producer = response.data;
                        });
               };

               $scope.getProductInfo();

               $scope.findNameOfProduct = function(productUID) {
                    for (var key in $scope.producer["products"]) {
                        if ($scope.producer["products"].hasOwnProperty(key)) {
                            var product =  $scope.producer["products"][key];
                            if (product.uid === productUID) {
                                return product.name;
                            }
                        }
                    }
               };
            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
