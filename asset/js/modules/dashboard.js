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

                $scope.currentProductUIDs = [];

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
                            //console.log(value);
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

                $scope.drawRevenueGraph = function() {
                  $scope.charts.revenue = c3.generate({
                      bindto: '#chart-revenue',
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

                $scope.drawPriceGraph = function() {
                  $scope.charts.price = c3.generate({
                    bindto: '#chart-price',
                    data: {
                        xs: {},
                        columns: []
                    },
                    point: {
                        show: false
                    },
                    zoom: {
                        enabled: true
                    },
                      transition: {
                          duration: 1000
                      },
                    axis: {
                        x: {
                            type: 'timeseries',
                                tick: { fit: false, format: '%H:%M:%S' }
                        },
                        y: {
                            tick: { fit: false }
                        }
                    },
                      line: {
                          step: {
                              type: 'step-after'
                          }
                      }
                  })
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

                $scope.updateRevenueGraph = function() {
                  console.log("updating Graph: RevenueGraph");

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

                  $scope.charts.revenue.load({
                      bindto: "#chart-revenue",
                      x: 'x',
                      columns: columns_array
                  });
                }

                $scope.updateSalesPerMinuteGraph = function(){
                  console.log("updating Graph: updateSalesPerMinuteGraph");

                  $scope.charts.salesPerMinute.load({
                      bindto: "#chart-salesPerMinute",
                      x: 'x',
                      columns: [
                          ['x'].concat($scope.data.salesPerMinute.map(e  => new Date(e.value.timestamp))),
                      ['price'].concat($scope.data.salesPerMinute.map(e => e.value.revenue))
                      ]
                  });
                }

                $scope.getMerchants();

                //load real data asap
                $scope.drawLiveSalesGraph();
                $scope.drawSalesPerMinuteGraph();
                $scope.drawRevenueGraph();
                $scope.drawPriceGraph();

                $scope.counter_liveGraphData = 0;
                $scope.counter_revenueGraphData = 0;
                $scope.counter_priceGraphData = 0;
                $scope.data.liveGraphData = [];
                $scope.data.revenueGraphData = [];
                $scope.data.priceGraphData = [];

                socket.on('buyOffer', function (data) {
                  data = angular.fromJson(data);

                  $scope.data.liveGraphData.push(data);
                  //console.log(angular.fromJson(data));

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
                  //console.log(angular.fromJson(data));

                  $scope.counter_revenueGraphData = $scope.counter_revenueGraphData+1; //lets only update the graph every X messages
                  if($scope.counter_revenueGraphData > 1){
                    $scope.updateRevenueGraph();
                    $scope.counter_revenueGraphData = 0;
                  }
                  // keep 100 elements
                  $scope.data.revenueGraphData = $scope.data.revenueGraphData.splice(-100);
                });

                $scope.updatePriceGraph = function() {
                  let xs_mapping = {}
                  let columns_array = []

                  const data = $scope.data.priceGraphData

                  const merchant_ids = new Set(data.map(x => x.merchant_id))
                  const product_ids = new Set(data.map(x => x.uid))
                  $scope.currentProductUIDs = Array.from(product_ids.values())

                  product_ids.forEach(pId => {
                      merchant_ids.forEach(mId => {
                          const line_id = pId + '-' + mId
                          const filtered_data = data.filter(x => x.merchant_id === mId && x.uid === pId)
                          const prices = filtered_data.map(x => x.price)
                          const times = filtered_data.map(x => new Date(x.timestamp))

                          xs_mapping['y'+line_id] = 'x'+line_id
                          columns_array.push(['y'+line_id].concat(prices))
                          columns_array.push(['x'+line_id].concat(times))
                    })
                  })

                  $scope.charts.price.load({
                    bindto: "#chart-price",
                    xs: xs_mapping,
                    columns: columns_array
                  });

                  // var chart = c3.generate({
                  //     data: {
                  //         xs: {
                  //             'data1': 'x1',
                  //             'data2': 'x2',
                  //         },
                  //         columns: [
                  //             ['x1', 10, 30, 45, 50, 70, 100],
                  //             ['x2', 30, 50, 75, 100, 120],
                  //             ['data1', 30, 200, 100, 400, 150, 250],
                  //             ['data2', 20, 180, 240, 100, 190]
                  //         ]
                  //     }
                  // });
                }

                socket.on('updateOffer', function (data) {
                  data = angular.fromJson(data);
                  // {
                  //   "topic": msg.topic,
                  //   "timestamp": msg.timestamp,
                  //   "value": {
                  //     "offer_id": 31, 
                  //     "uid": 32, 
                  //     "product_id": 3, 
                  //     "quality": 2, 
                  //     "merchant_id": 10, 
                  //     "amount": 3, 
                  //     "price": 34.0, 
                  //     "shipping_time_standard": 5, 
                  //     "shipping_time_prime": 1, 
                  //     "prime": true, 
                  //     "signature": "+D2Pew02v4TTCIlPIZoW7+cQCmWyp6ZRs46eJPoAbTU=", 
                  //     "http_code": 200, 
                  //     "timestamp": "2016-12-06T15:33:17.737Z"
                  //   }
                  // }

                  $scope.data.priceGraphData.push({
                    merchant_id: data.value.merchant_id,
                    price: data.value.price,
                    uid: data.value.uid,
                    timestamp: data.value.timestamp,
                  })

                  $scope.counter_priceGraphData = $scope.counter_priceGraphData + 1
                  if ($scope.counter_priceGraphData >= 10) {
                    $scope.updatePriceGraph()
                    $scope.counter_priceGraphData = 0
                  }
                  
                  $scope.data.priceGraphData = $scope.data.priceGraphData.slice(-100);
                });

                $scope.filterPriceGraphFor = function(product_uid) {
                  console.log("Filtering for " + product_uid);
                    /*
                     $scope.charts.price.hide(null, {
                        withLegend: true
                     });
                     // filter all columns by productUID and pass them to show below
                     colsToShow = columns_array.filter ...
                     $scope.charts.price.show(colsToShow, {
                        withLegend: true
                     });
                    */
                };

                //socket.on('connect', function (data) {
                //  console.log("conntect",data);
                //});

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
