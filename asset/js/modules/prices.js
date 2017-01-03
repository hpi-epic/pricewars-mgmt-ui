(function () {
    var pr = angular.module('prices', ['ngCookies']);

    pr.controller('pricesCtrl', ['socket', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function (socket, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                const maxNumberOfPointsInLine      = 10000;
                const filterForAllIDs              = "ALL";

                $scope.kafka_restful_service                = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";
                $scope.kafka_restful_service_sales          = $scope.kafka_restful_service + "log/buyOffer";
                $scope.kafka_restful_service_salesPerMinute = $scope.kafka_restful_service + "log/salesPerMinutes";
                $scope.marketplace_url                      = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";

                $scope.liveGraphData    = [];
                $scope.merchants        = [];
                $scope.merchant_ids     = [];
                $scope.product_uids     = [];

                $scope.currentUIDFilter = filterForAllIDs;

                $scope.data = [];
                $scope.charts = [];
                $scope.counter_priceGraphData = 0;
                $scope.data.priceGraphData = [];
                $scope.data.priceGraphPerMerchantData = [];

                $scope.redrawGraphTimeout   = undefined;
                $scope.redrawInterval       = 1000;

                Highcharts.setOptions({lang: {noData: "No data available (yet)"}});

                /**
                  * UI settings
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
                $scope.drawPricingHighChart = function(){
                  $scope.graphNames = ["highchart-price", "highchart-price_and_sales"];
                  angular.forEach($scope.merchant_ids, function(mId) {
                    $scope.graphNames.push("highchart-price-"+mId);
                  });
                  angular.forEach($scope.graphNames, function(grapName, key) {
                    $scope.charts[grapName] = Highcharts.stockChart(grapName, {
                            title: {
                                text: 'Price Updates'
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
                                    text: 'Price'
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
                                },{
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
                                },{
                                    type: 'all',
                                    text: 'All'
                                }],
                                inputEnabled: false,
                                selected: 0
                            },
                            legend: {
                              enabled: true
                            },
                            series: []
                      });
                      $scope.charts[grapName].setSize(undefined, 600);
                    });
                };

                /**
                  * Updating content of graphs
                */
                function updatePriceHighChart(newDataPoint) {
                  const graphs = ["highchart-price","highchart-price-"+newDataPoint.merchant_id];
                  angular.forEach(graphs, function(grapName, key) {
                    if($scope.charts[grapName]){
                      const lineID = newDataPoint.uid + '-' + newDataPoint.merchant_id;
                      let line = $scope.charts[grapName].get(lineID);
                      let point = [new Date(newDataPoint.timestamp).getTime(), newDataPoint.price];

                        addPointToLine($scope.charts[grapName], point, line, lineID);
                    } else {
                      $scope.drawPricingHighChart();
                    }
                  });
                }

                function updatePriceAndSalesChartWithPriceUpdate(newDataPoint) {
                    const lineID = newDataPoint.uid + '-' + newDataPoint.merchant_id;
                    let line = $scope.charts["highchart-price_and_sales"].get(lineID);
                    let point = [new Date(newDataPoint.timestamp).getTime(), newDataPoint.price];

                    addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID);
                }

                function updatePriceAndSalesChartWithSalesUpdate(newDataPoint) {
                    const lineID = newDataPoint.value.uid + '-' + newDataPoint.value.merchant_id;
                    let line = $scope.charts["highchart-price_and_sales"].get(lineID);
                    let point = {
                        x: new Date(newDataPoint.value.timestamp).getTime(),
                        y: newDataPoint.value.price,
                        marker: {fillColor: '#d60000'}
                    };
                    // todo depending on whether there are more items in stock or not, use circle or cross as symbol

                    addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID);
                }

                function addPointToLine(chart, point, line, lineID) {
                    // create a new series/line if it is not present yet
                    if (line === undefined || line === null) {
                        let newLine = {
                            name: lineID,
                            id: lineID,
                            data: [],
                            step: true,
                            marker: {
                                enabled: true,
                                radius: 4,
                                symbol: 'circle'
                            },
                            states: {
                                hover: {
                                    lineWidthPlus: 3
                                }
                            }
                        };
                        line = chart.addSeries(newLine);
                        if (!line.options.id.includes($scope.currentUIDFilter + '-') && $scope.currentUIDFilter != filterForAllIDs) line.hide();
                    }

                    // add the new point to the line
                    let shift = line.data.length > maxNumberOfPointsInLine;
                    line.addPoint(point, true, shift);
                }

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
                }

                $scope.arraysEqual = function(arr1, arr2) {
                    if (arr1.length !== arr2.length)
                        return false;
                    for (var i = arr1.length; i--;) {
                        if (arr1[i] !== arr2[i])
                            return false;
                    }
                    return true;
                }

                $scope.filterPriceGraphFor = function(product_uid) {
                    console.log("Filtering for " + product_uid);
                    $scope.currentUIDFilter = product_uid;

                    showOnlyFilteredPriceColumns();
                };

                // get all columns from the graph and filter for the currently chosen product_uid, then only take the IDs of those
                function getFilteredPriceColumns() {
                    let colsToShow = [];
                    if ($scope.currentUIDFilter == filterForAllIDs) {
                        colsToShow = $scope.charts["price"].internal.data.targets
                    } else {
                        colsToShow = $scope.charts["price"].internal.data.targets.filter(col => col.id.includes($scope.currentUIDFilter + '-'))
                    }
                    return colsToShow.map(col => col.id)
                }

                function showOnlyFilteredPriceColumns() {

                    /* ----- HighChart ----- */
                    $scope.charts["highchart-price"].series.forEach(function(serie) {
                        if ($scope.currentUIDFilter == filterForAllIDs || serie.options.id.includes($scope.currentUIDFilter + '-')) {
                            serie.setVisible(true, false);
                        } else {
                            serie.setVisible(false, false);
                        }
                    });
                    $scope.charts["highchart-price_and_sales"].series.forEach(function(serie) {
                        if ($scope.currentUIDFilter == filterForAllIDs || serie.options.id.includes($scope.currentUIDFilter + '-')) {
                            serie.setVisible(true, false);
                        } else {
                            serie.setVisible(false, false);
                        }
                    });
                    // redraw once at the end to avoid slow re-drawing at each series-visibility-change
                    $scope.charts["highchart-price"].redraw();
                    $scope.charts["highchart-price_and_sales"].redraw();


                    /* -------- C3 -------- */
                    let colsIDsToShow = getFilteredPriceColumns();

                    // hide all columns
                    $scope.charts["price"].hide(null, {
                        withLegend: true
                    });

                    // show only filtered columns
                    $scope.charts["price"].show(colsIDsToShow, {
                        withLegend: true
                    });
                }

                $scope.getMerchants();
                $scope.drawPricingHighChart();

                //load real data asap
                $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
                  $scope.drawPricingHighChart();
                });

                Array.prototype.pushIfNotExist = function(element) {
                    if (this.indexOf(element) === -1) {
                        this.push(element);
                    }
                    this.sort();
                };

                /**
                  * Handling socket events
                */
                socket.on('buyOffer', function (data) {
                    data = angular.fromJson(data);
                    updatePriceAndSalesChartWithSalesUpdate(data);
                });

                socket.on('updateOffer', function (data) {
                    console.log("updateOffer");
                    data = angular.fromJson(data);

                    let newDataPoint = {
                        merchant_id: data.value.merchant_id,
                        uid: data.value.uid,
                        price: data.value.price,
                        product_id: data.value.product_id,
                        timestamp: data.value.timestamp,
                    };

                   $scope.product_uids.pushIfNotExist(newDataPoint.uid);
                   updatePriceHighChart(newDataPoint)

                    updatePriceAndSalesChartWithPriceUpdate(newDataPoint);

                   // check if new merchants are in place. if so, draw graphs for them
                   if($scope.merchant_ids.indexOf(data.value.merchant_id) == -1){
                     $scope.merchant_ids.push(data.value.merchant_id);
                   }
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
