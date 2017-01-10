(function () {
    var da = angular.module('data', ['ngCookies']);

    da.controller('exportCtrl', ['$route', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($route, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

              $scope.kafka_reverse_proxy_url      = "http://vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de";
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
                $http.get(url + "/settings")
                    .then(function(response) {
                        $scope.topics  = response.data;
                    });
              }

              $scope.getExport = function(topic){
                $http({url: $scope.kafka_reverse_proxy_url + "/data/export/" + topic,
                      dataType: "json",
                      method: "POST",
                      data: {},
                      headers: {
                          "Content-Type": "application/json"
                      }
                    }).success(function (data) {
                          $scope.export_url = response.data.link;
                });
              }

              $scope.getTopics();
            }] //END: controller function
          );  // END: exportController

})(); //END: global function
