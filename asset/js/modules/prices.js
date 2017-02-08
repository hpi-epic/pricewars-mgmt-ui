(function () {
    var pr = angular.module('prices', ['ngCookies']);

    pr.controller('pricesCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints', 'charts',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, $timeout, merchants, endpoints, charts) {

                const filterForAll                 = "ALL";

                $scope.updateInterval             = 2000;
                var redrawGraphTimeout            = undefined;
                var timeoutCancelled              = false;

                $scope.liveGraphData    = [];
                $scope.merchant_ids     = [];

                $scope.product_ids     = charts.getCurrentProductIDs();
                $scope.currentIDFilter = "1";

                $scope.charts = [];

                /**
                  * UI settings
                */
                toastr.options = {
                    "debug": false,
                    "newestOnTop": false,
                    "positionClass": "toast-top-center",
                    "closeButton": true,
                    "toastClass": "animated fadeInDown",
                    "timeOut": "2000"
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
                }
                drawPriceGraphs();

                function redrawGraphs() {
                    for (var key in $scope.charts) {
                        if ($scope.charts.hasOwnProperty(key)) {
                           $scope.charts[key].redraw();
                        }
                    }
                    if ($scope.offerPullTimeout) $timeout.cancel($scope.offerPullTimeout);
                    if (!timeoutCancelled) $scope.offerPullTimeout = $timeout(redrawGraphs, $scope.updateInterval);
                }
                redrawGraphs();

                /**
                  * Helper
                */
                $scope.filterPriceGraphForID = function(product_id) {
                    $scope.currentIDFilter = product_id;
                    charts.priceUpdatesAndSales.filterForID($scope.charts["highchart-price_and_sales"], product_id);
                };

                /**
                  * Handling socket events
                */
                endpoints.getData().then(function(urls){
                   $scope.consumer_url   = urls.consumer_url;
                   $scope.marketplace_url= urls.marketplace_url;
                   $scope.producer_url   = urls.producer_url;
                   $scope.kafka_proxy    = urls.kafka_proxy;
                   var socket = io.connect($scope.kafka_proxy, {query: 'id=mgmt-ui'});

                   socket.on('buyOffer', function (data) {
                       data = angular.fromJson(data);
                       charts.priceUpdatesAndSales.updateGraphWithSalesData($scope.charts["highchart-price_and_sales"], data, $scope.currentIDFilter);
                   });

                   socket.on('updateOffer', function (data) {
                       data = angular.fromJson(data);
                       charts.priceUpdatesAndSales.updateGraphWithPriceData($scope.charts["highchart-price_and_sales"], data, $scope.currentIDFilter);
                   });

                   $scope.$on('$locationChangeStart', function() {
                       socket.disconnect();

                       timeoutCancelled = true;
                       $timeout.cancel(redrawGraphTimeout);
                   });
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
