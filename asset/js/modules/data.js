(function () {
    var da = angular.module('data', ['ngCookies']);

    da.controller('exportCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.kafka_reverse_proxy_url      = "http://192.168.31.91:8001";
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
                $http.get($scope.kafka_reverse_proxy_url + "/topics")
                    .then(function(response) {
                        $scope.topics  = response.data;
                    });
              }

              $scope.getExport = function(topic){
                $('#loadingModal').modal('show');
                $http.get($scope.kafka_reverse_proxy_url + "/export/data/" + topic)
                    .then(function(response) {
                        $scope.export_url  = $scope.kafka_reverse_proxy_url + "/"+ response.data.url;
                    });
              }

              $scope.getTopics();
            }] //END: controller function
          );  // END: exportController

})(); //END: global function
