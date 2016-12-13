(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['socket', '$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function (socket, $routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                $scope.kafka_restful_service                = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";
                $scope.kafka_restful_service_sales          = $scope.kafka_restful_service + "log/buyOffer";
                $scope.kafka_restful_service_salesPerMinute = $scope.kafka_restful_service + "log/salesPerMinutes";
                $scope.marketplace_url                      = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";

                $scope.liveGraphData = [];
                $scope.merchants     = [];
                $scope.merchant_ids  = [];
                $scope.product_ids   = [];

                $scope.currentUIDFilter = "ALL";

                $scope.data = [];
                $scope.charts = [];

                $scope.data.liveGraphData = [];
                $scope.data.revenueGraphData = [];
                $scope.data.marketshareData = [];

                $scope.counter_liveGraphData = 0;
                $scope.counter_revenueGraphData = 0;
                $scope.counter_marketshareData = 0;

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
                $scope.drawHighCharts = function(){
                  $(function () {
                      $scope.myChart = Highcharts.chart('highchart-revenue', {
                          chart: {
                              type: 'bar'
                          },
                          title: {
                              text: 'Fruit Consumption'
                          },
                          xAxis: {
                              categories: ['Apples', 'Bananas', 'Oranges']
                          },
                          yAxis: {
                              title: {
                                  text: 'Fruit eaten'
                              }
                          },
                          series: [{
                              name: 'Jane',
                              data: [1, 0, 4]
                          }, {
                              name: 'John',
                              data: [5, 7, 3]
                          }]
                      });
                  });
                }

                $scope.drawGraphs = function() {
                  const graphNames = ["liveSales", "salesPerMinute", "revenue"];
                  angular.forEach(graphNames, function(value, key) {
                    $scope.charts[value] = c3.generate({
                        bindto: '#chart-'+value.toString(),
                        data: {
                            x: 'x',
                            columns: [
                                ['x'],
                                ['price']
                            ],
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
                                tick: { fit: true, format: '%Y-%m-%d %H:%M:%S' }
                            }
                        },
                        line: {
                           step: {
                             type: 'step-after'
                           }
                        }
                    });
                  });
                }

                $scope.drawMarketshareGraph = function() {
                  $scope.charts["marketshare"] = c3.generate({
                      bindto: "#chart-marketshare",
                      data: {
                          columns: [],
                          type: 'bar'
                      },
                      bar: {
                          width: {
                              ratio: 0.5 // this makes bar width 50% of length between ticks
                          }
                      }
                  });
                }

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
                  * Updating chart content
                */
                $scope.updateLiveGraph = function() {
                  $scope.charts["liveSales"].load({
                      bindto: "#chart-liveSales",
                      x: 'x',
                      columns: [
                          ['x'].concat($scope.data.liveGraphData.map(e => new Date(e.value.timestamp))),
                      ['price'].concat($scope.data.liveGraphData.map(e => e.value.price))
                      ]
                  });
                }

                $scope.updateRevenueGraph = function() {
                  var columns_array = [];
                  var merchants_list = [];
                  var merchants_entries = [];
                  var x_arry = ['x'];

                  angular.forEach($scope.data.revenueGraphData, function(value, key) {
                    // initialize a new array for each merchant id if not present already
                    if(merchants_list.indexOf(value.value.merchant_id) == -1) {
                      merchants_list.push(value.value.merchant_id);
                      merchants_entries[''+value.value.merchant_id] = [];
                      merchants_entries[''+value.value.merchant_id].push(''+value.value.merchant_id);
                    }
                    // push timestamp once in timestamp array
                    if(x_arry.indexOf(new Date(value.value.timestamp)) == -1) {
                      x_arry.push(new Date(value.value.timestamp));
                    }
                    // push revenue in merchant array
                    merchants_entries[''+value.value.merchant_id].push(value.value.revenue);
                  });

                  columns_array.push(x_arry);
                  angular.forEach(merchants_list, function(merchant_id, key) {
                    columns_array.push(merchants_entries[''+merchant_id]);
                  });

                  $scope.charts["revenue"].load({
                      bindto: "#chart-revenue",
                      x: 'x',
                      columns: columns_array
                  });
                }

                $scope.updateSalesPerMinuteGraph = function(){
                  $scope.charts["salesPerMinute"].load({
                      bindto: "#chart-salesPerMinute",
                      x: 'x',
                      columns: [
                          ['x'].concat($scope.data.salesPerMinute.map(e => new Date(e.value.timestamp))),
                      ['price'].concat($scope.data.salesPerMinute.map(e => e.value.revenue))
                      ]
                  });
                }

                $scope.updateMarketshareGraph = function() {
                  let columns = []
                  let merchants = []
                  angular.forEach($scope.data.marketshareData, function(value, key) {
                    if(!merchants[value["merchant_id"]]) {
                      merchants[value["merchant_id"]] = [];
                    }
                    merchants[value["merchant_id"]].push(value["marketshare"]*100)
                  });

                  angular.forEach(merchants, function(value, key) {
                    let tmp= [];
                    tmp.push(key)
                    tmp = tmp.concat(value)
                    columns.push(tmp)
                  });

                  if($scope.charts["marketshare"]) {
                    $scope.charts["marketshare"].load({
                      bindto: "#chart-marketshare",
                      columns: columns
                    });
                  } else {
                    $scope.drawMarketshareGraph();
                  }
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

                $scope.filterPriceGraphFor = function(product_uid) {
                    console.log("Filtering for " + product_uid);
                    $scope.currentUIDFilter = product_uid;

                    // get all columns from the graph and filter for the given product_uid, then only take the IDs
                    let colsToShow = [];
                    if (product_uid == ("ALL")) {
                        colsToShow = $scope.charts["price"].internal.data.targets
                    } else {
                        colsToShow = $scope.charts["price"].internal.data.targets.filter(col => col.id.includes(product_uid + '-'))
                    }
                    let colsIDsToShow = colsToShow.map(col => col.id)

                    // hide all columns
                     $scope.charts["price"].hide(null, {
                        withLegend: true
                     });

                     // show only filtered columns
                    $scope.charts["price"].show(colsIDsToShow, {
                         withLegend: true
                     });
                };

                $scope.filterPriceGraphFor = function(product_uid) {
                    console.log("Filtering for " + product_uid);
                    $scope.currentUIDFilter = product_uid;

                    showOnlyFilteredPriceColumns();
                };

                $scope.arraysEqual = function(arr1, arr2) {
                    if (arr1.length !== arr2.length)
                        return false;
                    for (var i = arr1.length; i--;) {
                        if (arr1[i] !== arr2[i])
                            return false;
                    }
                    return true;
                }

                // get all columns from the graph and filter for the currently chosen product_uid, then only take the IDs of those
                function getFilteredPriceColumns() {
                    let colsToShow = [];
                    if ($scope.currentUIDFilter == ("ALL")) {
                        colsToShow = $scope.charts["price"].internal.data.targets
                    } else {
                        colsToShow = $scope.charts["price"].internal.data.targets.filter(col => col.id.includes($scope.currentUIDFilter + '-'))
                    }
                    return colsToShow.map(col => col.id)
                }

                function showOnlyFilteredPriceColumns() {
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
                $scope.drawGraphs();
                $scope.drawMarketshareGraph();

                /**
                  * Handling socket events
                */
                socket.on('buyOffer', function (data) {
                  data = angular.fromJson(data);

                  $scope.data.liveGraphData.push(data);

                  $scope.counter_liveGraphData = $scope.counter_liveGraphData+1; //lets only update the graph every X messages
                  if($scope.counter_liveGraphData > 10){
                    $scope.updateLiveGraph();
                    $scope.counter_liveGraphData = 0;
                  }
                  // keep 100 elements
                  $scope.data.liveGraphData = $scope.data.liveGraphData.splice(-100);
                });

                socket.on('revenue', function (data) {
                  data = angular.fromJson(data);

                  $scope.data.revenueGraphData.push(data);

                  $scope.counter_revenueGraphData = $scope.counter_revenueGraphData+1; //lets only update the graph every X messages
                  if($scope.counter_revenueGraphData > 1){
                    $scope.updateRevenueGraph();
                    $scope.counter_revenueGraphData = 0;
                  }
                  $scope.data.revenueGraphData = $scope.data.revenueGraphData.splice(-100); // keep 100 elements
                });


                socket.on('kumulativeTurnoverBasedMarketshare', function (data) {
                  data = angular.fromJson(data);
                  $scope.data.marketshareData.push(data.value);

                  $scope.counter_marketshareData = $scope.counter_marketshareData + 1
                  if ($scope.counter_marketshareData >= 3) {
                    $scope.updateMarketshareGraph()
                    $scope.counter_marketshareData = 0
                  }

                  $scope.data.marketshareData = $scope.data.marketshareData.slice(-100);
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
