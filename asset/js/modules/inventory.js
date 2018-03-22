(function () {
    const inventory = angular.module('inventory', ['ngCookies']);

    inventory.controller('inventoryController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints', 'charts', 'producer',
        function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, $timeout, merchants, endpoints, charts, producer) {

            $scope.product_ids = charts.getCurrentProductIDs();
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
                const hpanel = $(this).closest('div.hpanel');
                const icon = $(this).find('i:first');
                const body = hpanel.find('div.panel-body');
                const footer = hpanel.find('div.panel-footer');
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

            function drawPriceGraphs() {
                $scope.charts["highchart-inventory"] = Highcharts.stockChart(charts.inventory.html_id, charts.inventory.getOptions());
                charts.setSize($scope.charts["highchart-inventory"], undefined, 600);
            }

            let bulkUpdateOfferUpdate = [];

            function updateGraphWithPriceUpdate() {
                charts.inventory.updateGraphWithPriceData($scope.charts["highchart-inventory"], bulkUpdateOfferUpdate, $scope.currentIDFilter);
                bulkUpdateOfferUpdate = [];
                $scope.$digest();
            }

            /**
             * Handling socket events
             */
            endpoints.getData().then(function (urls) {
                $scope.consumer_url = urls.consumer_url;
                $scope.marketplace_url = urls.marketplace_url;
                $scope.producer_url = urls.producer_url;
                $scope.kafka_proxy = urls.kafka_proxy;

                merchants.loadMerchants().then(function () {
                    drawPriceGraphs();

                    const socket = io.connect($scope.kafka_proxy, {query: 'id=mgmt-ui'});

                    socket.on('inventory_level', function (data) {
                        data = angular.fromJson(data);

                        if (data instanceof Array) {
                            bulkUpdateOfferUpdate = bulkUpdateOfferUpdate.concat(data);
                        } else {
                            bulkUpdateOfferUpdate.push(data);
                        }

                        updateGraphWithPriceUpdate();
                    });
                    $scope.$on('$locationChangeStart', function () {
                        socket.disconnect();
                    });

                });
            });

        }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
