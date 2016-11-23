(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                $scope.kafka_restful_service = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";

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

                const logItems = [
                    {
                        offer_id: 1,
                        amount: 5,
                        price: 123.45,
                        timestamp: '2016-11-22T12:10:16+00:00'
                    },
                    {
                        offer_id: 1,
                        amount: 2,
                        price: 140.45,
                        timestamp: '2016-11-22T12:10:17+00:00'
                    },
                    {
                        offer_id: 1,
                        amount: 10,
                        price: 103.45,
                        timestamp: '2016-11-22T12:10:18+00:00'
                    }
                ]

                const testChart = c3.generate({
                    bindto: '#timeChart',
                    data: {
                        x: 'x',
                        columns: [
                            ['x'].concat(logItems.map(e => new Date(e.timestamp))),
                            ['price'].concat(logItems.map(e => e.price))
                        ]
                    },
                    axis: {
                        x: {
                            type: 'timeseries',
                            tick: { format: '%Y-%m-%d %H:%M:%S' }
                        }
                    }
                })

                $scope.fetchSellingData = function(){
                    $("#loadingModal").modal("show");
                    $http.get($scope.kafka_restful_service+'log/sales').then((result) => {
                        //TODO: check whether result.data returns empty array
                        $scope.logItems = result.data

                        let chart = c3.generate({
                            bindto: '#timeChart',
                            data: {
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.logItems.map(e => new Date(e.value.timestamp))),
                                    ['price'].concat($scope.logItems.map(e => e.value.price))
                                ]
                            },
                            axis: {
                                x: {
                                    type: 'timeseries',
                                    tick: { format: '%Y-%m-%d %H:%M:%S' }
                                }
                            }
                        })

                        $("#loadingModal").modal("hide");
                    })
                }

                //load real data asap
                $scope.fetchSellingData();

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
