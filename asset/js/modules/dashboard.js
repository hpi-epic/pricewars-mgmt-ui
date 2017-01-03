(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['socket', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function (socket, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                const maxNumberOfPointsInLine  = 10000;

                $scope.kafka_restful_service                = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";
                $scope.kafka_restful_service_sales          = $scope.kafka_restful_service + "log/buyOffer";
                $scope.kafka_restful_service_salesPerMinute = $scope.kafka_restful_service + "log/salesPerMinutes";
                $scope.marketplace_url                      = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";

                $scope.liveGraphData = [];
                $scope.merchants     = [];
                $scope.merchant_ids  = [];
                $scope.product_ids   = [];

                $scope.currentUIDFilter = "ALL";

                $scope.charts = [];

                Highcharts.setOptions({lang: {noData: "No data available (yet)"}});

                /**
                  * UI Settings
                */
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

                /**
                  * REST calls
                */
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
                              $scope.getMerchantDetails(value["api_endpoint_url"]);
                          });
                      });
                }

                /**
                  * Initializing Graphs
                */

                $scope.drawStockGraphs = function() {
                    const graphNames = ["liveSales"];
                    angular.forEach(graphNames, function (value, key) {
                        $scope.charts[value] = Highcharts.stockChart('chart-' + value, {
                            title: {
                                text: value
                            },
                            xAxis: {
                                type: 'datetime',
                                title: {
                                    text: 'Date'
                                },
                                ordinal: false
                            },
                            yAxis: {
                                title: {
                                    text: value
                                },
                                opposite: false
                            },
                            rangeSelector: {
                                buttons: [{
                                    count: 30,
                                    type: 'second',
                                    text: '30S'
                                }, {
                                    count: 1,
                                    type: 'minute',
                                    text: '1M'
                                }, {
                                    count: 5,
                                    type: 'minute',
                                    text: '5M'
                                }, {
                                    count: 30,
                                    type: 'minute',
                                    text: '30M'
                                }, {
                                    count: 1,
                                    type: 'hour',
                                    text: '1H'
                                }, {
                                    type: 'all',
                                    text: 'All'
                                }],
                                inputEnabled: false,
                                selected: 0
                            },
                            legend: {
                                enabled: true
                            },
                            series: [{
                                name: value,
                                id: value,
                                data: []
                            }]
                        });
                    });
                };

                $scope.drawBarGraphs = function() {
                    const graphNames = ["revenue"];
                    angular.forEach(graphNames, function(value, key) {
                        $scope.charts[value] = Highcharts.chart('chart-' + value, {
                            chart: {
                                type: 'column'
                            },
                            title: {
                                text: value
                            },
                            xAxis: {
                                type: 'datetime',
                                title: {
                                    text: 'Date'
                                }
                            },
                            yAxis: {
                                title: {
                                    text: value
                                }
                            },
                            legend: {
                                //reversed: true,
                                enabled: true,
                                labelFormat: 'Merchant {name}'
                            },
                            tooltip: {
                                headerFormat: '<b>{point.x:%b %e, %Y %H:%M}</b><br/>',
                                pointFormat: '<b>Merchant {series.name}:</b> {point.y}'
                            },
                            series: []
                        });
                    });
                };

                $scope.drawStackedBarGraphs = function() {
                    const graphNames = ["marketshare"];
                    angular.forEach(graphNames, function(value, key) {
                        $scope.charts[value] = Highcharts.chart('chart-' + value, {
                            chart: {
                                type: 'column'
                            },
                            title: {
                                text: value
                            },
                            xAxis: {
                                type: 'datetime',
                                title: {
                                    text: 'Date'
                                },
                                labels: {
                                    format: 'Merchant {value}'
                                }
                            },
                            yAxis: {
                                title: {
                                    text: value
                                },
                                stackLabels: {
                                    enabled: true,
                                    style: {
                                        fontWeight: 'bold',
                                        color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray',
                                        format: '{value}%'
                                    }
                                }
                            },
                            legend: {
                                //reversed: true,
                                enabled: true,
                                labelFormat: 'Merchant {name}'
                            },
                            plotOptions: {
                                column: {
                                    stacking: 'normal'
                                }
                            },
                            series: []
                        });
                    });
                };

                /**
                  * Updating chart content
                */
                function updateLiveSalesGraph(newDataPoint) {
                    let point = [new Date(newDataPoint.value.timestamp).getTime(), newDataPoint.value.price]
                    let line = $scope.charts["liveSales"].get("liveSales");
                    let shift = line.data.length > maxNumberOfPointsInLine;
                    line.addPoint(point, true, shift);
                }

                function updateRevenueGraph(newDataPoint) {
                    // todo only display new point if merchant is currently running
                    const lineID = newDataPoint.value.merchant_id;
                    let line = $scope.charts["revenue"].get(lineID);
                    let date = new Date(newDataPoint.value.timestamp);
                    date.setMilliseconds(0);
                    let point = [date.getTime(), newDataPoint.value.revenue];

                    // create a new series/line if it is not present yet
                    if (line === undefined || line === null) {
                        let newLine = {
                            name: lineID,
                            id: lineID,
                            data: []
                        };
                        line = $scope.charts["revenue"].addSeries(newLine);
                    }

                    // add the new point to the line
                    let shift = line.data.length > maxNumberOfPointsInLine;
                    line.addPoint(point, true, shift);
                }

                function updateMarketshareGraph(newDataPoint) {
                    const lineID = newDataPoint.value.merchant_id;
                    let line = $scope.charts["revenue"].get(lineID);
                    let date = new Date(newDataPoint.value.timestamp);
                    date.setMilliseconds(0);
                    let point = [date.getTime(), newDataPoint.value.marketshare * 100];

                    // create a new series/line if it is not present yet
                    if (line === undefined || line === null) {
                        let newLine = {
                            name: lineID,
                            id: lineID,
                            data: []
                        };
                        line = $scope.charts["revenue"].addSeries(newLine);
                    }

                    // add the new point to the line
                    let shift = line.data.length > maxNumberOfPointsInLine;
                    line.addPoint(point, true, shift);
                }

                /*$scope.updateSalesPerMinuteGraph = function(){
                  $scope.charts["salesPerMinute"].load({
                      bindto: "#chart-salesPerMinute",
                      x: 'x',
                      columns: [
                          ['x'].concat($scope.data.salesPerMinute.map(e => new Date(e.value.timestamp))),
                      ['price'].concat($scope.data.salesPerMinute.map(e => e.value.revenue))
                      ]
                  });
                };*/

                /**
                  * Helper
                */
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
                };

                $scope.arraysEqual = function(arr1, arr2) {
                    if (arr1.length !== arr2.length)
                        return false;
                    for (var i = arr1.length; i--;) {
                        if (arr1[i] !== arr2[i])
                            return false;
                    }
                    return true;
                };

                $scope.getMerchants();
                $scope.drawStockGraphs();
                $scope.drawBarGraphs();
                $scope.drawStackedBarGraphs();

                /**
                  * Handling socket events
                */
                socket.on('buyOffer', function (data) {
                  data = angular.fromJson(data);
                  updateLiveSalesGraph(data);
                });

                socket.on('revenue', function (data) {
                  data = angular.fromJson(data);
                  updateRevenueGraph(data);
                });

                socket.on('kumulativeTurnoverBasedMarketshare', function (data) {
                  data = angular.fromJson(data);
                  updateMarketshareGraph(data);
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
