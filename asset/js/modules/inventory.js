(function () {
    var inventory = angular.module('inventory', ['ngCookies']);

    inventory.controller('inventoryController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints', 'charts', 'producer',
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
                    $scope.charts["highchart-inventory"] = Highcharts.stockChart(charts.inventory.html_id, charts.inventory.getOptions());
                    charts.setSize($scope.charts["highchart-inventory"], undefined, 600);
                }

                /**
                 * Updating Graphs
                 */
                var bulkBuyOfferUpdate = [];
                var bulkUpdateOfferUpdate = [];

                function updateGraphWithBuy() {
                    if (bulkBuyOfferUpdate.length >= $scope.maxBulkSizeBuy) {
                        charts.inventory.updateGraphWithSalesData($scope.charts["highchart-inventory"], bulkBuyOfferUpdate, $scope.currentIDFilter);
                        bulkBuyOfferUpdate = [];
                        $scope.$digest();
                    }
                }

                function updateGraphWithPriceUpdate() {
                    if (bulkUpdateOfferUpdate.length >= $scope.maxBulkSizeUpdate) {
                        charts.inventory.updateGraphWithPriceData($scope.charts["highchart-inventory"], bulkUpdateOfferUpdate, $scope.currentIDFilter);
                        bulkUpdateOfferUpdate = [];
                        $scope.$digest();
                    }
                }

                /**
                  * Handling socket events
                */
                endpoints.getData().then(function(urls){
                   $scope.consumer_url   = urls.consumer_url;
                   $scope.marketplace_url= urls.marketplace_url;
                   $scope.producer_url   = urls.producer_url;
                   $scope.kafka_proxy    = urls.kafka_proxy;

                    merchants.loadMerchants().then(function() {
                       drawPriceGraphs();

                       var socket = io.connect($scope.kafka_proxy, {query: 'id=mgmt-ui'});

                       socket.on('buyOffer', function (data) {
                           data = angular.fromJson(data);

                           if (data instanceof Array) {
                               bulkBuyOfferUpdate = bulkBuyOfferUpdate.concat(data);
                           } else {
                               bulkBuyOfferUpdate.push(data);
                           }

                           updateGraphWithBuy();
                           removeLoadingSpinner(0);
                       });


                        socket.on('addOffer', function (data) {
                            data = angular.fromJson(data);

                            if (data instanceof Array) {
                                bulkUpdateOfferUpdate = bulkUpdateOfferUpdate.concat(data);
                            } else {
                                bulkUpdateOfferUpdate.push(data);
                            }

                            updateGraphWithPriceUpdate();
                            removeLoadingSpinner(1);
                        });

                       socket.on('updateOffer', function (data) {
                           data = angular.fromJson(data);

                           if (data instanceof Array) {
                               bulkUpdateOfferUpdate = bulkUpdateOfferUpdate.concat(data);
                           } else {
                               bulkUpdateOfferUpdate.push(data);
                           }

                           updateGraphWithPriceUpdate();
                           removeLoadingSpinner(2);
                       });

                       $scope.$on('$locationChangeStart', function() {
                           socket.disconnect();
                       });

                    });
                });

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
