(function () {
    const inventory = angular.module('inventory', ['ngCookies']);

    inventory.controller('inventoryController', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', '$timeout', 'merchants', 'endpoints', 'charts', 'producer',
        function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, $timeout, merchants, endpoints, charts, producer) {

            $scope.chart = Highcharts.stockChart(charts.inventory.html_id, charts.inventory.getOptions());

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

            function drawInventoryGraph() {
                charts.setSize($scope.chart, undefined, 600);
            }

            /**
             * Handling socket events
             */
            endpoints.getData().then(function (urls) {
                merchants.loadMerchants().then(function () {
                    drawInventoryGraph();

                    const socket = io.connect(urls.kafka_proxy, {query: 'id=mgmt-ui'});

                    socket.on('inventory_level', function (data) {
                        data = angular.fromJson(data);
                        let events = [];

                        if (data instanceof Array) {
                            events = data;
                        } else {
                            events.push(data);
                        }

                        charts.inventory.updateGraphWithPriceData($scope.chart, events);
                        $scope.$digest();
                    });
                    $scope.$on('$locationChangeStart', function () {
                        socket.disconnect();
                    });

                });
            });

        }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
