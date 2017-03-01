(function () {
    var pr = angular.module('prices', ['ngCookies']);

    pr.controller('pricesCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints', 'charts', 'producer',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, $timeout, merchants, endpoints, charts, producer) {

                $scope.maxBulkSizeBuy       = 10;
                $scope.maxBulkSizeUpdate    = 25;

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

                /**
                 * Updating Graphs
                 */
                var bulkBuyOfferUpdate = [];
                var bulkUpdateOfferUpdate = [];

                $scope.$watch('maxBulkSizeUpdate', function() {
                    updateGraphWithPriceUpdate();
                });

                $scope.$watch('maxBulkSizeBuy', function() {
                    updateGraphWithPriceUpdate();
                });

                function updateGraphWithBuy() {
                    if (bulkBuyOfferUpdate.length >= $scope.maxBulkSizeBuy) {
                        charts.priceUpdatesAndSales.updateGraphWithSalesData($scope.charts["highchart-price_and_sales"], bulkBuyOfferUpdate, $scope.currentIDFilter);
                        bulkBuyOfferUpdate = [];
                        $scope.$digest();
                    }
                }

                function updateGraphWithPriceUpdate() {
                    if (bulkUpdateOfferUpdate.length >= $scope.maxBulkSizeUpdate) {
                        charts.priceUpdatesAndSales.updateGraphWithPriceData($scope.charts["highchart-price_and_sales"], bulkUpdateOfferUpdate, $scope.currentIDFilter);
                        bulkUpdateOfferUpdate = [];
                        $scope.$digest();
                    }
                }

                /**
                  * Helper
                */
                $scope.filterPriceGraphForID = function(product_id) {
                    $scope.currentIDFilter = product_id;
                    charts.priceUpdatesAndSales.filterForID($scope.charts["highchart-price_and_sales"], product_id);
                };

                $scope.getProductName = function(product_id) {
                    return producer.getNameForProductID(product_id);
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

                       if (data instanceof Array) {
                           bulkBuyOfferUpdate = bulkBuyOfferUpdate.concat(data);
                       } else {
                           bulkBuyOfferUpdate.push(data);
                       }

                       updateGraphWithBuy();
                   });

                   socket.on('updateOffer', function (data) {
                       data = angular.fromJson(data);

                       if (data instanceof Array) {
                           bulkUpdateOfferUpdate = bulkUpdateOfferUpdate.concat(data);
                       } else {
                           bulkUpdateOfferUpdate.push(data);
                       }

                       updateGraphWithPriceUpdate();
                   });

                   $scope.$on('$locationChangeStart', function() {
                       socket.disconnect();
                   });

                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
