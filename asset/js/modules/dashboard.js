(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['socket', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function (socket, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                $scope.kafka_restful_service = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";
                $scope.kafka_restful_service_sales = $scope.kafka_restful_service + "log/buyOffer";
                $scope.kafka_restful_service_salesPerMinute = $scope.kafka_restful_service + "log/salesPerMinutes";

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

                $scope.data = [];
                $scope.charts = [];

                $scope.fetchGraphData = function(){
                    $("#loadingModal").modal("show");
                    $http.get($scope.kafka_restful_service_sales).then((result) => {

                        $scope.data.liveSales = result.data;

                        $scope.charts.liveSales = c3.generate({
                            bindto: '#chart-live-sales',
                            data: {
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.data.liveSales.map(e => new Date(e.value.timestamp))),
                                    ['price'].concat($scope.data.liveSales.map(e => e.value.price))
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

                        $("#loadingModal").modal("hide");
                        setTimeout( $scope.updateLiveGraph, 3000);
                    });

                    $http.get($scope.kafka_restful_service_salesPerMinute).then((result) => {
                        $scope.data.salesPerMinute = result.data;

                        $scope.charts.salesPerMinute = c3.generate({
                            bindto: '#chart-salesPerMinute',
                            data: {
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.data.salesPerMinute.map(e => new Date(e.value.timestamp))),
                                ['price'].concat($scope.data.salesPerMinute.map(e => e.value.price))
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

                        setTimeout( $scope.updateSalesPerMinuteData, 3000);
                    });
                };

                $scope.updateLiveGraph = function() {
                    console.log("requesting updated live data from kafka");
                    $http.get($scope.kafka_restful_service_sales).then((result) => {
                        $scope.drawLiveGraph(result);
                        setTimeout( $scope.updateLiveGraph, 1000);
                    });
                };

                $scope.updateSalesPerMinuteData = function() {
                    console.log("requesting updated spm-data from kafka");
                    $http.get($scope.kafka_restful_service_salesPerMinute).then((result) => {
                        $scope.drawSalesPerMinuteGraph(result);
                        setTimeout( $scope.updateSalesPerMinuteData, 1000);
                    });
                };

                $scope.drawLiveGraph = function(result) {
                  var dataChanged = $scope.data.liveSales.length != result.data.length;
                  var dataChangedText = !dataChanged ? 'live data did not change' : (result.data.length - $scope.data.liveSales.length) + ' new items';
                  console.log("received answer from kafka - " + dataChangedText);

                  if (dataChanged) {
                      $scope.data.liveSales = result.data;

                      $scope.charts.liveSales.load({
                          bindto: "#chart-live-sales",
                          x: 'x',
                          columns: [
                              ['x'].concat($scope.data.liveSales.map(e => new Date(e.value.timestamp))),
                          ['price'].concat($scope.data.liveSales.map(e => e.value.price))
                          ]
                      });
                  }
                }

                $scope.drawSalesPerMinuteGraph = function(result){
                  var dataChanged = $scope.data.salesPerMinute.length != result.data.length;
                  var dataChangedText = !dataChanged ? 'spm-data did not change' : (result.data.length - $scope.data.salesPerMinute.length) + ' new items';
                  console.log("received answer for spm-data from kafka - " + dataChangedText);

                  if (dataChanged) {
                      $scope.data.salesPerMinute = result.data;

                      $scope.charts.salesPerMinute.load({
                          bindto: "#chart-salesPerMinute",
                          x: 'x',
                          columns: [
                              ['x'].concat($scope.data.salesPerMinute.map(e => new Date(e.value.timestamp))),
                          ['price'].concat($scope.data.salesPerMinute.map(e => e.value.price))
                          ]
                      });
                  }
                }


                //load real data asap
                $scope.fetchGraphData();

                socket.on('buyOffer', function (data) {
                  console.log("buyOffer", data);
                });

                socket.on('connect', function (data) {
                  console.log("conntect",data);
                });


            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
