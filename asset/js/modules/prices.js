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
                $scope.drawPriceGraphs = function() {
                  var graphNames = ["price"];
                  angular.forEach($scope.merchant_ids, function(mId) {
                    graphNames.push("price-"+mId);
                  });
                  angular.forEach(graphNames, function(grapName, key) {
                    const chartname = '#chart-'+grapName
                    $scope.charts[""+grapName] = c3.generate({
                      bindto: chartname,
                      data: {
                          xs: {},
                          columns: [],
                          type: 'step'
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
                                  tick: { fit: true, format: '%H:%M:%S' }
                          }
                      },
                        line: {
                            step: {
                                type: 'step-after'
                            }
                        }
                    })
                  });
                }

                /**
                  * Updating content of graphs
                */
                $scope.updatePriceGraph = function() {
                  let xs_mapping = {}
                  let columns_array = []

                  const data = $scope.data.priceGraphData
                  $scope.merchant_ids = Array.from((new Set(data.map(x => x.merchant_id))).values()).sort()
                  $scope.product_uids  = Array.from((new Set(data.map(x => x.uid))).values()).sort()

                  $scope.product_uids.forEach(pId => {
                    $scope.merchant_ids.forEach(mId => {
                      const line_id = pId + '-' + mId
                      const filtered_data = data.filter(x => x.merchant_id === mId && x.uid === pId)
                      const prices = filtered_data.map(x => x.price)
                      const times = filtered_data.map(x => new Date(x.timestamp))

                      xs_mapping['y'+line_id] = 'x'+line_id
                      columns_array.push(['y'+line_id].concat(prices))
                      columns_array.push(['x'+line_id].concat(times))
                    })
                  })

                  $scope.charts["price"].load({
                    bindto: "#chart-price",
                    xs: xs_mapping,
                    columns: columns_array
                  });

                  // make sure to only show currently filtered lines in case new products have been added
                  showOnlyFilteredPriceColumns();
                }

                $scope.updatePriceGraphPerMerchant = function() {
                  const data = $scope.data.priceGraphData
                  const new_merchants = Array.from((new Set(data.map(x => x.merchant_id))).values()).sort()

                  // check if new merchants are in place. if so, draw graphs for them
                  if(!$scope.arraysEqual($scope.merchant_ids,new_merchants)){
                    //$scope.drawPriceGraphs();
                    $scope.merchant_ids = new_merchants;
                  }

                  $scope.merchant_ids.forEach(mId => {
                    let xs_mapping = {}
                    let columns_array = []

                    $scope.product_uids.forEach(pId => {
                      const line_id = '_product_id_' + pId
                      const filtered_data = data.filter(x => x.merchant_id === mId && x.uid === pId)
                      const prices = filtered_data.map(x => x.price)
                      const times = filtered_data.map(x => new Date(x.timestamp))

                      xs_mapping['y'+line_id] = 'x'+line_id
                      columns_array.push(['y'+line_id].concat(prices))
                      columns_array.push(['x'+line_id].concat(times))
                    })

                    if($scope.charts["price-"+mId]) {
                      $scope.charts["price-"+mId].load({
                        bindto: "#chart-price-"+mId,
                        xs: xs_mapping,
                        columns: columns_array
                      });
                    } else {
                      $scope.drawPriceGraphs();
                    }
                  })
                }

                $scope.drawPriceUpdateHighChart = function(){
                    $scope.charts["priceUpdateHighChart"] = Highcharts.stockChart('highchart-price', {
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
                    $scope.charts["priceUpdateHighChart"].setSize(undefined, 600);
                };

                function updatePriceUpdateHighChart(newDataPoint) {
                    const lineID = newDataPoint.uid + '-' + newDataPoint.merchant_id
                    let line = $scope.charts["priceUpdateHighChart"].get(lineID)
                    let point = [new Date(newDataPoint.timestamp).getTime(), newDataPoint.price]

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
                        line = $scope.charts["priceUpdateHighChart"].addSeries(newLine);
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
                    $scope.charts["priceUpdateHighChart"].series.forEach(function(serie) {
                        if ($scope.currentUIDFilter == filterForAllIDs || serie.options.id.includes($scope.currentUIDFilter + '-')) {
                            serie.show();
                        } else {
                            serie.hide();
                        }
                    });


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
                $scope.drawPriceGraphs();
                $scope.drawPriceUpdateHighChart();

                //load real data asap
                $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
                  $scope.drawPriceGraphs();
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
                       updatePriceUpdateHighChart(newDataPoint)

                    // TODO refactor the part below, we only have that for the C3-single merchant graphs now, make it similar to the above and use highcharts instead
                     $scope.data.priceGraphData.push(newDataPoint)
                      $scope.counter_priceGraphData = $scope.counter_priceGraphData + 1
                      if ($scope.counter_priceGraphData >= 3) {
                        //$scope.updatePriceGraph()
                        $scope.updatePriceGraphPerMerchant();
                        $scope.counter_priceGraphData = 0
                      }

                      $scope.data.priceGraphData = $scope.data.priceGraphData.slice(-100);
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
