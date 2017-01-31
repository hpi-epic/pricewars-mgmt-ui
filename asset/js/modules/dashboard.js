(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints', 'charts',
        function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints, charts) {

            $scope.marketplace_url  = endpoints.marketplace_url;

            $scope.merchants        = merchants.get();
            $scope.consumers        = {};
            $scope.consumers_ids    = [];

            $scope.charts = [];

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
                 $http.get($scope.marketplace_url + "/consumers")
                     .then(function(response) {
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
                        $http.get($scope.consumers[consumerID]["api_endpoint_url"] + "/setting")
                            .then(function(response) {
                                Object.keys(response.data).sort().forEach(function(key) {
                                    if (key != "consumer_id") {
                                        $scope.consumers[consumerID][key] = response.data[key];
                                    }
                                });
                            });
                        $http.get($scope.consumers[consumerID]["api_endpoint_url"]+ "/status")
                            .then(function(response) {
                                $scope.consumers[consumerID]["status"] = response.data.status;
                            });
                    })(consumerID);
                }
            }

            $scope.getConsumers();

            /**
             * Initializing Graphs
             */
            function drawDashboardGraphs() {
                /* --- Livesales --- */
                $scope.charts["liveSales"] = Highcharts.stockChart(charts.liveSales.html_id, charts.liveSales.getOptions());

                /* --- Revenue --- */
                $scope.charts["revenue"] = Highcharts.chart(charts.revenue.html_id, charts.revenue.getOptions());
                charts.setDefaultZoom($scope.charts["revenue"], 10);
                charts.setSize($scope.charts["revenue"], undefined, 500);

                $scope.charts["revenue-per-minute"] = Highcharts.chart(charts.revenuePerMinute.html_id, charts.revenuePerMinute.getOptions());
                charts.setDefaultZoom($scope.charts["revenue-per-minute"], 10);
                charts.setSize($scope.charts["revenue"], undefined, 500);

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

            drawDashboardGraphs();

            /**
             * Helper
             */
            $scope.merchantStatus = function(merchant){
                if(merchant["state"] == "initialized"){
                    return "hpanel hbgblue";
                } else if (merchant["state"] == "running") {
                    return "hpanel hbggreen";
                } else if (merchant["state"] == "exiting") {
                    return "hpanel hbgyellow";
                } else if (merchant["state"] == "stopping") {
                    return "hpanel hbgorange";
                } else {
                    return "hpanel hbgred";
                }
            };

            $scope.consumerStatus = function(consumer){
                if(consumer["status"] == "running"){
                    return "hpanel hbggreen";
                } else {
                    return "hpanel hbgred";
                }
            };

            $scope.statusFilter = function(consumers) {
                var result = {};
                angular.forEach(consumers, function(consumer, key) {
                  angular.forEach(consumer, function(value, setting) {
                    if (key == "status" && value == "running") {
                        result[key] = consumer;
                    }
                  });
                });
                return result;
            }

            $scope.findMerchantNameById = function(merchant_id) {
                return merchants.getMerchantName(merchant_id);
            };

            $scope.findConsumerNameById = function(consumer_id) {
                return $scope.consumers[consumer_id]["consumer_name"];
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

            /**
             * Handling socket events
             */
            var socket = io.connect("http://192.168.31.91:8001/", {query: 'id=mgmt-ui'});

            socket.on('buyOffer', function (data) {
                data = angular.fromJson(data);
                charts.liveSales.updateGraphWithData($scope.charts["liveSales"], data);
            });

            socket.on('revenue', function (data) {
                data = angular.fromJson(data);
                charts.revenue.updateGraphWithData($scope.charts["revenue"], data);
            });

            socket.on('cumulativeTurnoverBasedMarketshare', function (data) {
                data = angular.fromJson(data);
                charts.marketshare.updateGraphWithData($scope.charts["marketshare"], data);
            });

            // every 10sec market situation for last 60 secs
            socket.on('revenuePerMinute', function (data) {
                data = angular.fromJson(data);
                charts.revenuePerMinute.updateGraphWithData($scope.charts["revenue-per-minute"], data);
            });

            socket.on('revenuePerHour', function (data) {
                data = angular.fromJson(data);
                charts.revenuePerHour.updateGraphWithData($scope.charts["revenue-per-hour"], data);
            });

            $scope.$on('$locationChangeStart', function() {
                socket.disconnect();
            });

        }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
