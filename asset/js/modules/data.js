(function () {
    var da = angular.module('data', ['ngCookies']);

    da.controller('exportCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', 'endpoints', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, endpoints, $rootScope) {

              $scope.topics                       = [];

              // Toastr options
              toastr.options = {
                  "debug": false,
                  "newestOnTop": false,
                  "positionClass": "toast-top-center",
                  "closeButton": true,
                  "toastClass": "animated fadeInDown",
                  "timeOut": "2000",
              };

              $scope.getTopics = function(){
                $http.get($scope.kafka_proxy + "/topics")
                    .then(function(response) {
                        $scope.topics  = response.data;
                    });
              }

              $scope.getExport = function(topic){
                $('#loadingModal').modal('show');
                $http.get($scope.kafka_proxy + "/export/data/" + topic)
                    .then(function(response) {
                        $scope.export_url  = $scope.kafka_proxy + "/"+ response.data.url;
                    });
              }

              endpoints.getData().then(function(urls){
                 $scope.consumer_url   = urls.consumer_url;
                 $scope.marketplace_url= urls.marketplace_url;
                 $scope.producer_url   = urls.producer_url;
                 $scope.kafka_proxy    = urls.kafka_proxy;
                 $scope.getTopics();
              });
            }] //END: controller function
          );  // END: exportController

})(); //END: global function
