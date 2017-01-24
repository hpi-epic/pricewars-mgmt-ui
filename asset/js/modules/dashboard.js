(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants', 'endpoints', 'charts',
        function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants, endpoints, charts) {

            const maxNumberOfPointsInLine  = 10000;

            $scope.marketplace_url         = endpoints.marketplace_url;

            $scope.liveGraphData = [];
            $scope.merchants     = merchants.get();
            $scope.consumers     = {};
            $scope.consumers_ids = [];
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
                         $http.get($scope.consumers[consumerID]["api_endpoint_url"])
                             .then(function(response) {
                                 if(response.code == 200){
                                   console.log(response.code);
                                   Object.keys(response.data).sort().forEach(function(key) {
                                       if (key != "merchant_id" && key != "merchant_url") {
                                           $scope.consumers[consumer_id][key] = response.data[key];
                                       }
                                   });
                                 } else {
                                   delete $scope.consumers[consumer_id];
                                 }
                             });
                     })(consumerID);
                 }
             };

             //$scope.getConsumers();

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

                /* --- Marketshare --- */
                $scope.charts["marketshare"] = Highcharts.chart(charts.marketshare.html_id, charts.marketshare.getOptions());
                charts.setDefaultZoom($scope.charts["marketshare"], 10);
                charts.setSize($scope.charts["marketshare"], undefined, 500);
            }

            drawDashboardGraphs();

            /**
             * Updating chart content
             */
            function updateLiveSalesGraph(newData) {
                parseBulkData(newData).forEach(function(dp) {
                    let point = [new Date(dp.value.timestamp).getTime(), dp.value.price];
                    let line = $scope.charts["liveSales"].get("liveSales");
                    let shift = line.data.length > maxNumberOfPointsInLine;

                    line.addPoint(point, false, shift);
                });
                $scope.charts["liveSales"].redraw()
            }

            function updateRevenueGraph(newData) {
                parseBulkData(newData).forEach(function(dp) {
                    let date = new Date(dp.value.timestamp);
                    date.setMilliseconds(0);

                    const lineID = dp.value.merchant_id;
                    let line = $scope.charts["revenue"].get(lineID);
                    let point = [date.getTime(), dp.value.revenue];

                    addPointToLine($scope.charts["revenue"], point, line, lineID);
                });
                $scope.charts["revenue"].redraw()
            }

            function updateMarketshareGraph(newData) {
                parseBulkData(newData).forEach(function(dp) {
                    let date = new Date(dp.value.timestamp);
                    date.setMilliseconds(0);

                    const lineID = dp.value.merchant_id;
                    let line = $scope.charts["marketshare"].get(lineID);
                    let point = [date.getTime(), dp.value.marketshare * 100];

                    addPointToLine($scope.charts["marketshare"], point, line, lineID);
                });
                $scope.charts["marketshare"].redraw()
            }

            function addPointToLine(chart, point, line, lineID) {
                // create a new series/line if it is not present yet
                if (line === undefined || line === null) {
                    let newLine = {
                        name: merchants.getMerchantName(lineID),
                        id: lineID,
                        data: []
                    };
                    line = chart.addSeries(newLine, false);
                }

                // add the new point to the line
                let shift = line.data.length > maxNumberOfPointsInLine;
                line.addPoint(point, false, shift);

                // only show the line if it belongs to a currently active merchant
                if (merchants.isRegisteredMerchant(lineID)) {
                    line.setVisible(true, false);
                } else {
                    line.setVisible(false, false);
                }

            }

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

            $scope.findMerchantNameById = function(merchant_id) {
                return merchants.getMerchantName(merchant_id);
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
                updateLiveSalesGraph(data);
            });

            socket.on('revenue', function (data) {
                data = angular.fromJson(data);
                updateRevenueGraph(data);
            });

            socket.on('cumulativeTurnoverBasedMarketshare', function (data) {
                data = angular.fromJson(data);
                updateMarketshareGraph(data);
            });

            $scope.$on('$locationChangeStart', function() {
                socket.disconnect();
            });

        }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
