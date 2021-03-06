(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints', 'charts',
        function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints, charts) {

            $scope.merchants        = merchants.get();
            $scope.consumers        = {};
            $scope.consumers_ids    = [];

            $scope.charts           = [];

            /**
             * Loading spinner (is shown until all graphs are drawn and have the initial historic data in it)
             */
            $("#loadingModal").modal("show");
            var graphsInitialized   = [false, false, false, false, false]; // one bool for each graph!

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
             $scope.getConsumers = function(){
                 $http({url: "/request",
                        params: {"url": $scope.marketplace_url + "/consumers"}
                      }).then(function(response) {
                         for (var key in response.data) {
                             if (response.data.hasOwnProperty(key)) {
                                 var consumer = response.data[key];
                                 var consumerID = -1;
                                 for (var consumer_key in consumer) {
                                     if (consumer_key == "consumer_id") {
                                         consumerID = consumer[consumer_key];
                                         delete(consumer[consumer_key]);
                                     }
                                 }
                                 $scope.consumers[consumerID] = consumer;
                             }
                         }
                         getConsumerDetails();
                     });
             };

            function getConsumerDetails() {
                for (var consumerID in $scope.consumers) {
                    (function(consumerID) {
                        $http({url: "/request",
                              params: {"url": $scope.consumers[consumerID]["api_endpoint_url"] + "/setting"}
                        }).then(function(response) {
                                Object.keys(response.data).sort().forEach(function(key) {
                                    if (key != "consumer_id") {
                                        $scope.consumers[consumerID][key] = response.data[key];
                                    }
                                });
                            });
                        $http({
                          url: "/request",
                          params: {"url": $scope.consumers[consumerID]["api_endpoint_url"]+ "/status"}
                        }).then(function(response) {
                          $scope.consumers[consumerID]["status"] = response.data.status;
                        });
                    })(consumerID);
                }
            }

            endpoints.getData().then(function(urls){
              $scope.consumer_url   = urls.consumer_url;
              $scope.marketplace_url= urls.marketplace_url;
              $scope.producer_url   = urls.producer_url;
              $scope.getConsumers();
            });

            /**
             * Initializing Graphs
             */
            function drawDashboardGraphs() {
                /* --- Livesales --- */
                $scope.charts["liveSales"] = Highcharts.stockChart(charts.liveSales.html_id, charts.liveSales.getOptions());

                $scope.charts["profit"] = Highcharts.chart(charts.profit.html_id, charts.profit.getOptions());
                charts.setDefaultZoom($scope.charts["profit"], 10);
                charts.setSize($scope.charts["profit"], undefined, 500);

                $scope.charts["profit-per-minute"] = Highcharts.chart(charts.profitPerMinute.html_id, charts.profitPerMinute.getOptions());
                charts.setDefaultZoom($scope.charts["profit-per-minute"], 10);
                charts.setSize($scope.charts["profit-per-minute"], undefined, 500);

                $scope.charts["revenue-per-minute"] = Highcharts.chart(charts.revenuePerMinute.html_id, charts.revenuePerMinute.getOptions());
                charts.setDefaultZoom($scope.charts["revenue-per-minute"], 10);
                charts.setSize($scope.charts["revenue-per-minute"], undefined, 500);

                $scope.charts["revenue-per-hour"] = Highcharts.chart(charts.revenuePerHour.html_id, charts.revenuePerHour.getOptions());
                charts.setDefaultZoom($scope.charts["revenue-per-hour"], 10);
                charts.setSize($scope.charts["revenue-per-hour"], undefined, 500);

                /* --- Revenue per Minute --- */
                $scope.charts["revenue-per-minute"] = Highcharts.chart(charts.revenuePerMinute.html_id, charts.revenuePerMinute.getOptions());
                charts.setDefaultZoom($scope.charts["revenue-per-minute"], 10);
                charts.setSize($scope.charts["revenue-per-minute"], undefined, 500);

                /* --- Marketshare --- */
                $scope.charts["marketshare"] = Highcharts.chart(charts.marketshare.html_id, charts.marketshare.getOptions());
                charts.setDefaultZoom($scope.charts["marketshare"], 10);
                charts.setSize($scope.charts["marketshare"], undefined, 500);
            }

            /**
             * Helper
             */
            $scope.merchantStatus = function(merchant){
                if (merchant["state"] === "running") {
                    return "hpanel dashboard-status-div status-green";
                } else if (merchant["state"] === "stopping") {
                    return "hpanel dashboard-status-div status-orange";
                } else {
                    return "hpanel dashboard-status-div status-red";
                }
            };

            $scope.consumerStatus = function(consumer){
                if(consumer["status"] === "running"){
                    return "hpanel dashboard-status-div status-green";
                } else if (consumer["status"] === "dead") {
                    return "hpanel dashboard-status-div status-orange";
                } else {
                    return "hpanel dashboard-status-div status-red";
                }
            };

            $scope.calculateConsumerTraffic = function(consumer){
                if (consumer) {
                    return (consumer["amount_of_consumers"] * consumer["consumer_per_minute"] * consumer["probability_of_buy"]) / 100;
                } else {
                    return "unknown"
                }
            };

            $scope.findMerchantNameById = function(merchant_id) {
                return merchants.getMerchantName(merchant_id);
            };

            $scope.findConsumerNameById = function(consumer_id) {
                return $scope.consumers[consumer_id]["consumer_name"];
            };

            function removeLoadingSpinner(graphID) {
                if (!graphsInitialized[graphID]) {
                    graphsInitialized[graphID] = true;

                    if (graphsInitialized.every(function (initialized) {
                            return initialized;
                        })) {
                        $("#loadingModal").modal("hide");
                        $(".dashboard-status-div .panel-body");
                    }
                }
            }

            /**
             * Handling socket events
             */
            endpoints.getData().then(function(urls){
               $scope.consumer_url   = urls.consumer_url;
               $scope.marketplace_url= urls.marketplace_url;
               $scope.producer_url   = urls.producer_url;

                merchants.loadMerchants().then(function() {
                  drawDashboardGraphs();

                  var socket = io.connect({query: 'id=mgmt-ui'});

                  socket.on('buyOffer', function (data) {
                      data = angular.fromJson(data);
                      charts.liveSales.updateGraphWithData($scope.charts["liveSales"], data);
                      removeLoadingSpinner(0);
                  });

                  socket.on('profit', function (data) {
                      data = angular.fromJson(data);
                      charts.profit.updateGraphWithData($scope.charts["profit"], data);
                      removeLoadingSpinner(1);
                  });

                  socket.on('cumulativeRevenueBasedMarketshare', function (data) {
                      data = angular.fromJson(data);
                      charts.marketshare.updateGraphWithData($scope.charts["marketshare"], data);
                      removeLoadingSpinner(2);
                  });

                  // every 10sec market situation for last 60 secs
                  socket.on('profitPerMinute', function (data) {
                      data = angular.fromJson(data);
                      charts.profitPerMinute.updateGraphWithData($scope.charts["profit-per-minute"], data);
                      removeLoadingSpinner(3);
                  });

                  // every 10sec market situation for last 60 secs
                  socket.on('revenuePerMinute', function (data) {
                      data = angular.fromJson(data);
                      charts.revenuePerMinute.updateGraphWithData($scope.charts["revenue-per-minute"], data);
                      removeLoadingSpinner(3);
                  });

                  socket.on('revenuePerHour', function (data) {
                      data = angular.fromJson(data);
                      charts.revenuePerHour.updateGraphWithData($scope.charts["revenue-per-hour"], data);
                      removeLoadingSpinner(4);
                  });

                  $scope.$on('$locationChangeStart', function() {
                      socket.disconnect();
                  });
                });
            });

        }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
