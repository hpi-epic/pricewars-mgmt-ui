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
                $http.get(endpoints.kafka_proxy + "/topics")
                    .then(function(response) {
                        $scope.topics  = response.data;
                    });
              }

              $scope.getExport = function(topic){
                $('#loadingModal').modal('show');
                $http.get(endpoints.kafka_proxy + "/export/data/" + topic)
                    .then(function(response) {
                        $scope.export_url  = endpoints.kafka_proxy + "/"+ response.data.url;
                    });
              }

              $scope.getTopics();
            }] //END: controller function
          );  // END: exportController

})(); //END: global function
