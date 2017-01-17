(function () {
    var pr = angular.module('prices', ['ngCookies']);

    pr.controller('pricesCtrl', ['socket', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function (socket, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                const maxNumberOfPointsInLine      = 10000;
                const filterForAllIDs              = "ALL";

                $scope.marketplace_url             = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";

                $scope.liveGraphData    = [];
                $scope.merchants        = {};
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

                /**
                 * Highcharts Settings
                 */
                Highcharts.setOptions({lang: {noData: "No data available (yet)"}});

                // Define a custom cross symbol path
                Highcharts.SVGRenderer.prototype.symbols.cross = function (x, y, w, h) {
                    return ['M', x, y, 'L', x + w, y + h, 'M', x + w, y, 'L', x, y + h, 'z'];
                };
                if (Highcharts.VMLRenderer) {
                    Highcharts.VMLRenderer.prototype.symbols.cross = Highcharts.SVGRenderer.prototype.symbols.cross;
                }

                // Set default colors and exclude red so red is only used manually to mark selling data points
                Highcharts.theme = {
                    colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9',
                        '#d05bf0', '#e4d354', '#116d01',  '#2b908f', '#91e8e1']
                };
                Highcharts.setOptions(Highcharts.theme);

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
                $scope.getMerchants = function(){
                    $http.get($scope.marketplace_url + "/merchants")
                        .then(function(response) {
                            for (var key in response.data) {
                                if (response.data.hasOwnProperty(key)) {
                                    var merchant = response.data[key];
                                    var merchantID = -1;
                                    for (var merch_key in merchant) {
                                        if (merch_key == "merchant_id") {
                                            merchantID = merchant[merch_key];
                                            delete(merchant[merch_key]);
                                        }
                                    }
                                    $scope.merchants[merchantID] = merchant;
                                }
                            }
                            getMerchantDetails();
                        });
                };

                function getMerchantDetails() {
                    for (var merchantID in $scope.merchants) {
                        (function(merchant_id) {
                            $http.get($scope.merchants[merchant_id]["api_endpoint_url"] + "/settings")
                                .then(function(response) {
                                    Object.keys(response.data).sort().forEach(function(key) {
                                        if (key != "merchant_id" && key != "merchant_url") {
                                            $scope.merchants[merchant_id][key] = response.data[key];
                                        }
                                    });
                                });
                        })(merchantID);
                    }
                };

                /**
                  * Initializing Graphs
                */
                $scope.drawPricingHighChart = function(){
                  $scope.graphNames = ["highchart-price", "highchart-price_and_sales"];
                  angular.forEach($scope.merchant_ids, function(mId) {
                    $scope.graphNames.push("highchart-price-"+mId);
                  });
                  angular.forEach($scope.graphNames, function(graphName, key) {
                    $scope.charts[graphName] = Highcharts.stockChart(graphName, {
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
                                selected: 5
                            },
                            tooltip: {
                                pointFormat: '<b>{series.name}:</b> {point.y}€'
                            },
                            legend: {
                              enabled: true
                            },
                            series: []
                      });
                      $scope.charts[graphName].setSize(undefined, 600);
                    });
                };

                /**
                  * Updating content of graphs
                */
                function updatePriceHighChart(newData) {
                    parseBulkData(newData).forEach(function(dp) {
                      const graphs = ["highchart-price","highchart-price-" + dp.value.merchant_id];
                      angular.forEach(graphs, function(graphName, key) {
                        if($scope.charts[graphName]){
                            const lineID = createLineID(dp);
                            const lineName = createLineName(dp);
                            if (graphName.indexOf("highchart-price-") > -1) {
                                lineName = "PID: " + dp.value.uid;
                            }

                          let line = $scope.charts[graphName].get(lineID);
                          let point = [new Date(dp.value.timestamp).getTime(), dp.value.price];

                          addPointToLine($scope.charts[graphName], point, line, lineID, lineName);
                        } else {
                          $scope.drawPricingHighChart();
                        }
                      });

                        $scope.charts[graphName].redraw();

                        // check if new merchants are in place. if so, draw graphs for them
                        if($scope.merchant_ids.indexOf(data.value.merchant_id) == -1){
                            $scope.merchant_ids.push(data.value.merchant_id);
                        }
                    });

                }

                function updatePriceAndSalesChartWithPriceUpdate(newData) {
                    parseBulkData(newData).forEach(function(dp) {
                        $scope.product_uids.pushIfNotExist(dp.value.uid);

                        const lineID = createLineID(dp);
                        const lineName = createLineName(dp);
                        let line = $scope.charts["highchart-price_and_sales"].get(lineID);
                        let point = [new Date(dp.value.timestamp).getTime(), dp.value.price];

                        addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID, lineName);
                    });
                    $scope.charts["highchart-price_and_sales"].redraw();
                }

                function updatePriceAndSalesChartWithSalesUpdate(newData) {
                    parseBulkData(newData).forEach(function(dp) {
                        $scope.product_uids.pushIfNotExist(dp.value.uid);

                        const lineID = createLineID(dp);
                        const lineName = createLineName(dp);
                        let line = $scope.charts["highchart-price_and_sales"].get(lineID);
                        let point;
                        if (dp.value.left_in_stock > 0) {
                            point = {
                                x: new Date(dp.value.timestamp).getTime(),
                                y: dp.value.price,
                                marker: {fillColor: '#d60000', radius: 4}
                            };
                            addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID);
                        } else {
                            point = {
                                x: new Date(dp.value.timestamp).getTime(),
                                y: dp.value.price,
                                marker: {fillColor: '#d60000', symbol: 'cross', lineColor: '#d60000', lineWidth: 3}
                            };
                            addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID);

                            // add a null-point right after the actual point to make sure it wont be connected to the next point
                            let nullPoint = {
                                x: new Date(dp.value.timestamp).getTime() + 1,
                                y: null
                            };
                            addPointToLine($scope.charts["highchart-price_and_sales"], nullPoint, line, lineID, lineName);
                        }
                    });
                    $scope.charts["highchart-price_and_sales"].redraw();
                }

                function addPointToLine(chart, point, line, lineID, lineName) {
                    // create a new series/line if it is not present yet
                    if (line === undefined || line === null) {
                        let dashStyle = 'Solid';
                        if (chart.series.length >= Highcharts.theme.colors.length) dashStyle = 'LongDash';
                        let newLine = {
                            name: (lineName) ? lineName : lineID,
                            id: lineID,
                            data: [],
                            step: true,
                            dashStyle: dashStyle,
                            lineWidth: 2,
                            marker: {
                                enabled: true,
                                radius: 4,
                                symbol: 'circle'
                            },
                            states: {
                                hover: {
                                    lineWidthPlus: 2
                                }
                            }
                        };
                        line = chart.addSeries(newLine);
                        if (!line.options.id.includes($scope.currentUIDFilter + '-') && $scope.currentUIDFilter != filterForAllIDs) line.hide();
                    }

                    // add the new point to the line
                    let shift = line.data.length > maxNumberOfPointsInLine;
                    line.addPoint(point, false, shift);
                }

                /**
                  * Helper
                */
                function createLineID(data) {
                    return lineID = data.value.uid + '-' + data.value.merchant_id;
                }

                function createLineName(data) {
                    return "PID: " + data.value.uid + " - M: " + findMerchantNameById(data.value.merchant_id);
                }

                function findMerchantNameById(id){
                    return ($scope.merchants[id] && $scope.merchants[id].merchant_name) ? $scope.merchants[id].merchant_name : id.substring(0, 8);
                }

                function selectAllDataRange(chartname) {
                    $scope.charts[chartname].rangeSelector.clickButton(5,{type: 'all'},true);
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

                $scope.filterPriceGraphFor = function(product_uid) {
                    console.log("Filtering for " + product_uid);
                    $scope.currentUIDFilter = product_uid;

                    showOnlyFilteredPriceColumns();
                };

                function showOnlyFilteredPriceColumns() {
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

                    selectAllDataRange("highchart-price");
                    selectAllDataRange("highchart-price_and_sales");
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

                function parseBulkData(newData) {
                    var data = newData;
                    if (!(newData instanceof Array)) {
                        data = [newData]
                    } else {
                        data = newData.map(e => { return angular.fromJson(e) })
                    }
                    return data;
                }

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

                   updatePriceHighChart(data);
                   updatePriceAndSalesChartWithPriceUpdate(data);
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
