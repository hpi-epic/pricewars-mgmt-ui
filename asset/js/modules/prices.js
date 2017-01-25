(function () {
    var pr = angular.module('prices', ['ngCookies']);

    pr.controller('pricesCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints', 'charts',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints, charts) {

                const maxNumberOfPointsInLine      = 10000;
                const filterForAllIDs              = "ALL";

                $scope.marketplace_url             = endpoints.marketplace_url;

                $scope.liveGraphData    = [];
                $scope.merchant_ids     = [];
                $scope.product_uids     = [];

                $scope.currentUIDFilter = filterForAllIDs;

                $scope.charts = [];

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
                  * Initializing Graphs
                */
                function drawPriceGraphs() {
                    /* --- Price Updates and Item Sales --- */
                    $scope.charts["highchart-price_and_sales"] = Highcharts.stockChart(charts.priceUpdatesAndSales.html_id, charts.priceUpdatesAndSales.getOptions());
                    charts.setSize($scope.charts["highchart-price_and_sales"], undefined, 600);

                    /* --- Price Updates (without Sales) --- */
                    $scope.charts["highchart-price"] = Highcharts.chart(charts.priceUpdates.html_id, charts.priceUpdates.getOptions());
                    charts.setSize($scope.charts["highchart-price"], undefined, 600);

                    /* --- Price Updates per Merchant --- */
                    angular.forEach($scope.merchant_ids, function(mId) {
                        let chart_title = charts.priceUpdatesPerMerchant.title(merchants.getMerchantName(mId));
                        $scope["highchart-price-"+mId] = Highcharts.chart(charts.priceUpdatesPerMerchant.html_id(), charts.priceUpdates.getOptions());;
                        charts.setSize($scope.charts["highchart-price-"+mId], undefined, 600);
                    });
                }

                drawPriceGraphs();

                /**
                  * Updating content of graphs
                */
                function updatePriceHighChart(newData) {
                    parseBulkData(newData).forEach(function(dp) {
                      const graphs = ["highchart-price","highchart-price-" + dp.value.merchant_id];
                      angular.forEach(graphs, function(graphName, key) {
                        if($scope.charts[graphName]){
                            const lineID = createLineName(dp);
                            if (graphName.indexOf("highchart-price-") > -1) {
                                lineName = "PID: " + dp.value.uid;
                            }

                          let line = $scope.charts[graphName].get(lineID);
                          let point = [new Date(dp.value.timestamp).getTime(), dp.value.price];

                          addPointToLine($scope.charts[graphName], point, line, lineID, dp.value.merchant_id);
                        } else {
                          $scope.drawPricingHighChart();
                        }
                      });

                        $scope.charts[graphName].redraw();

                        // check if new merchants are in place. if so, draw graphs for them
                        if($scope.merchant_ids.indexOf(data.value.merchant_id) == -1){
                            $scope.merchant_ids.push(data.value.merchant_id);
                            merchants.updateMerchants();
                        }
                    });

                }

                function updatePriceAndSalesChartWithPriceUpdate(newData) {
                    parseBulkData(newData).forEach(function(dp) {
                        if (merchants.isRegisteredMerchant(dp.value.merchant_id)) {
                            $scope.product_uids.pushIfNotExist(dp.value.uid);

                            const lineID = createLineName(dp);
                            let line = $scope.charts["highchart-price_and_sales"].get(lineID);
                            let point = [new Date(dp.value.timestamp).getTime(), dp.value.price];

                            addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID, dp.value.merchant_id);
                        }
                    });
                    $scope.charts["highchart-price_and_sales"].redraw();
                }

                function updatePriceAndSalesChartWithSalesUpdate(newData) {
                    parseBulkData(newData).forEach(function(dp, index) {
                        if (merchants.isRegisteredMerchant(dp.value.merchant_id)) {
                            $scope.product_uids.pushIfNotExist(dp.value.uid);

                            const lineID = createLineName(dp);
                            let line = $scope.charts["highchart-price_and_sales"].get(lineID);
                            let point;
                            if (dp.value.left_in_stock > 0) {
                                point = {
                                    x: new Date(dp.value.timestamp).getTime(),
                                    y: dp.value.price,
                                    marker: {fillColor: '#d60000', radius: 4}
                                };

                                addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID, dp.value.merchant_id);
                            } else {
                                point = {
                                    x: new Date(dp.value.timestamp).getTime(),
                                    y: dp.value.price,
                                    marker: {fillColor: '#d60000', symbol: 'cross', lineColor: '#d60000', lineWidth: 3}
                                };
                                line = addPointToLine($scope.charts["highchart-price_and_sales"], point, line, lineID, dp.value.merchant_id);

                                // add a null-point right after the actual point to make sure it wont be connected to the next point
                                let nullPoint = {
                                    x: new Date(dp.value.timestamp).getTime() + 1,
                                    y: null
                                };
                                addPointToLine($scope.charts["highchart-price_and_sales"], nullPoint, line, lineID, dp.value.merchant_id);
                            }
                        }
                    });
                    $scope.charts["highchart-price_and_sales"].redraw();
                }

                function addPointToLine(chart, point, line, lineID, merchant_id) {
                    // create a new series/line if it is not present yet
                    if (line === undefined || line === null) {
                        let dashStyle = 'Solid';
                        if (chart.series.length >= Highcharts.theme.colors.length) dashStyle = 'LongDash';
                        let newLine = {
                            name: lineID,
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
                        if (!line.options.id.includes('PID: ' + $scope.currentUIDFilter) && $scope.currentUIDFilter != filterForAllIDs) line.hide();
                    }

                    // add the new point to the line
                    let shift = line.data.length > maxNumberOfPointsInLine;
                    line.addPoint(point, false, shift);

                    // only show the line if it belongs to a currently active merchant
                    if (merchants.isRegisteredMerchant(merchant_id)) {
                        line.setVisible(true, false);
                    } else {
                        line.setVisible(false, false);
                    }

                    return line;
                }

                /**
                  * Helper
                */
                function createLineName(data) {
                    return "PID: " + data.value.uid + " - M: " + merchants.getMerchantName(data.value.merchant_id);
                }

                function selectAllDataRange(chartname) {
                    if ($scope.charts[chartname].rangeSelector) {
                        $scope.charts[chartname].rangeSelector.clickButton(5,{type: 'all'},true);
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
                };

                $scope.filterPriceGraphFor = function(product_uid) {
                    console.log("Filtering for " + product_uid);
                    $scope.currentUIDFilter = product_uid;

                    showOnlyFilteredPriceColumns();
                };

                function showOnlyFilteredPriceColumns() {
                    let chartnames = ["highchart-price", "highchart-price_and_sales"];
                    chartnames.forEach(function(chartname) {
                        $scope.charts[chartname].series.forEach(function(serie) {
                            if ($scope.currentUIDFilter == filterForAllIDs || serie.options.id.includes('PID: ' + $scope.currentUIDFilter)) {
                                serie.setVisible(true, false);
                            } else {
                                serie.setVisible(false, false);
                            }
                        });

                        // redraw once at the end to avoid slow re-drawing at each series-visibility-change
                        $scope.charts[chartname].redraw();

                        selectAllDataRange(chartname);
                    });

                }

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
                var socket = io.connect("http://192.168.31.91:8001/", {query: 'id=mgmt-ui'});

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

                $scope.$on('$locationChangeStart', function() {
                    socket.disconnect();
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
