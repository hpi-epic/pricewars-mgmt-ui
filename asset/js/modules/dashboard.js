(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['socket', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function (socket, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                $scope.kafka_restful_service                = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";
                $scope.kafka_restful_service_sales          = $scope.kafka_restful_service + "log/buyOffer";
                $scope.kafka_restful_service_salesPerMinute = $scope.kafka_restful_service + "log/salesPerMinutes";
                $scope.marketplace_url                      = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";

                $scope.liveGraphData = [];
                $scope.merchants = [];

                // Toastr options
                toastr.options = {
                    "debug": false,
                    "newestOnTop": false,
                    "positionClass": "toast-top-center",
                    "closeButton": true,
                    "toastClass": "animated fadeInDown",
                    "timeOut": "2000",
                };

                $('.showhide').click(function (event) {
                    event.preventDefault();
                    var hpanel = $(this).closest('div.hpanel');
                    var icon = $(this).find('i:first');
                    var body = hpanel.find('div.panel-body');
                    var footer = hpanel.find('div.panel-footer');
                    body.slideToggle(300);
                    footer.slideToggle(200);

                    // Toggle icon from up to down
                    icon.toggleClass('fa-chevron-up').toggleClass('fa-chevron-down');
                    hpanel.toggleClass('').toggleClass('panel-collapse');
                    setTimeout(function () {
                        hpanel.resize();
                        hpanel.find('[id^=map-]').resize();
                    }, 50);
                });

                $scope.getMerchantDetails = function(url){
                  $http.get(url + "/settings")
                      .then(function(response) {
                          $scope.merchants.push(response.data);
                      });
                }

                $scope.getMerchants = function(){
                  $http.get($scope.marketplace_url + "/merchants")
                      .then(function(response) {
                          angular.forEach(response.data, function(value, key) {
                            console.log(value);
                              $scope.getMerchantDetails(value["api_endpoint_url"]);
                          });
                      });
                }

                $scope.merchantStatus = function(merchant){
                  if(merchant["state"] == "init"){
                    return "hpanel hbgblue";
                  } else if (merchant["state"] == "running") {
                    return "hpanel hbggreen";
                  } else if (merchant["state"] == "exiting") {
                    return "hpanel hbgyellow";
                  } else if (merchant["state"] == "stopping") {
                    return "hpanel hbgred";
                  } else {
                    return "hpanel hbgred";
                  }
                }


                $scope.data = [];
                $scope.charts = [];

                $scope.drawLiveSalesGraph = function() {
                  $scope.charts.liveSales = c3.generate({
                      bindto: '#chart-live-sales',
                      data: {
                          x: 'x',
                          columns: [
                              ['x'],
                              ['price']
                          ]
                      },
                      point: {
                        show: false
                      },
        							zoom: {
        								enabled: true
        							},
                      axis: {
                          x: {
                              type: 'timeseries',
                              tick: { fit: true, format: '%Y-%m-%d %H:%M:%S' }
                          }
                      },
                      line: {
                         step: {
                           type: 'step-after'
                         }
                      }
                  });
                }

                $scope.drawSalesPerMinuteGraph = function() {
                  $scope.charts.salesPerMinute = c3.generate({
                      bindto: '#chart-salesPerMinute',
                      data: {
                          x: 'x',
                          columns: [
                              ['x'],
                          ['price']
                          ]
                      },
                      point: {
                          show: false
                      },
                      zoom: {
                          enabled: true
                      },
                      axis: {
                          x: {
                              type: 'timeseries',
                                  tick: { fit: true, format: '%Y-%m-%d %H:%M:%S' }
                          }
                      },
                      line: {
                          step: {
                              type: 'step-after'
                          }
                      }
                  });
                }

                $scope.updateLiveGraph = function() {
                  console.log("updating Graph: LiveGraph");

                  $scope.charts.liveSales.load({
                      bindto: "#chart-live-sales",
                      x: 'x',
                      columns: [
                          ['x'].concat($scope.data.liveGraphData.map(e => new Date(e.value.timestamp))),
                      ['price'].concat($scope.data.liveGraphData.map(e => e.value.price))
                      ]
                  });
                }

                $scope.updateSalesPerMinuteGraph = function(){
                  console.log("updating Graph: updateSalesPerMinuteGraph");

                  $scope.charts.salesPerMinute.load({
                      bindto: "#chart-salesPerMinute",
                      x: 'x',
                      columns: [
                          ['x'].concat($scope.data.salesPerMinute.map(e => new Date(e.value.timestamp))),
                      ['price'].concat($scope.data.salesPerMinute.map(e => e.value.price))
                      ]
                  });
                }


                $scope.getMerchants();

                //load real data asap
                $scope.drawLiveSalesGraph();
                $scope.drawSalesPerMinuteGraph();

                $scope.counter = 0;
                $scope.data.liveGraphData = [];

                socket.on('buyOffer', function (data) {
                  data  = angular.fromJson(data);
                  data.value  = angular.fromJson(data.value);

                  $scope.data.liveGraphData.push(data);
                  console.log("buyOffer: New event");
                  console.log(angular.fromJson(data));

                  $scope.counter = $scope.counter+1; //lets only update the graph every X messages
                  if($scope.counter > 10){
                    $scope.updateLiveGraph();
                    $scope.counter = 0;
                  }
                  if($scope.data.liveGraphData.length > 100){
                    $scope.data.liveGraphData = $scope.data.liveGraphData.splice(0,15);
                  }
                });

                //socket.on('connect', function (data) {
                //  console.log("conntect",data);
                //});

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
