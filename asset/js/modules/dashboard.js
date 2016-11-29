(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                $scope.kafka_restful_service = "http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/";
                $scope.kafka_restful_service_sales = $scope.kafka_restful_service + "/log/sales";
                $scope.kafka_restful_service_offers = $scope.kafka_restful_service + "/log/buyOffer";

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
                ];

                var filterFromDate = new Date();
                filterFromDate.setMonth(10);
                filterFromDate.setDate(23);

                $scope.fetchSellingData = function(){
                    $("#loadingModal").modal("show");
                    $http.get($scope.kafka_restful_service_sales).then((result) => {
                        //TODO: check whether result.data returns empty array

                        $scope.logItems = result.data;

						// only show last 20 sales
						//$scope.logItems = $scope.logItems.slice($scope.logItems.length - 21, $scope.logItems.length - 1);

                        $scope.chart = c3.generate({
                            bindto: '#timeChart',
                            data: {
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.logItems.map(e => new Date(e.value.timestamp))),
                                    ['price'].concat($scope.logItems.map(e => e.value.price))
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

                        $("#loadingModal").modal("hide");
                        setTimeout( $scope.updateGraph(), 3000);
                    });

                    $http.get($scope.kafka_restful_service_offers).then((result) => {
                        //TODO: check whether result.data returns empty array
                        filterDataWithDate(result.data, filterFromDate);

                        $scope.logItems_2 = result.data;

                        // only show last 20 sales
                        //$scope.logItems = $scope.logItems.slice($scope.logItems.length - 21, $scope.logItems.length - 1);

                        $scope.chart_2 = c3.generate({
                            bindto: '#timeChart_2',
                            data: {
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.logItems_2.map(e => new Date(e.value.timestamp))),
                              ['price'].concat($scope.logItems_2.map(e => e.value.price))
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

                        setTimeout( $scope.updateGraph2(), 3000);
                    });
                };

                $scope.updateGraph = function() {
                    console.log("requesting updated data from kafka");
                    $http.get($scope.kafka_restful_service_sales).then((result) => {
                        var dataChanged = $scope.logItems.length != result.data.length;
                        var dataChangedText = !dataChanged ? 'data did not change' : (result.data.length - $scope.logItems.length) + ' new items';
                        console.log("received answer from kafka - " + dataChangedText);

                        if (dataChanged) {
                            $scope.logItems = result.data;


                            $scope.chart.load({
                                bindto: "#timeChart",
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.logItems_2.map(e => new Date(e.value.timestamp))),
                                ['price'].concat($scope.logItems.map(e => e.value.price))
                                ]
                            });
                        }

                        setTimeout( $scope.updateGraph(), 1000);
                    });
                };

                $scope.updateGraph2 = function() {
                    console.log("requesting updated data_2 from kafka");
                    $http.get($scope.kafka_restful_service_offers).then((result) => {
                        filterDataWithDate(result.data, filterFromDate);

                        var dataChanged = $scope.logItems_2.length != result.data.length;
                        var dataChangedText = !dataChanged ? 'data_2 did not change' : (result.data.length - $scope.logItems_2.length) + ' new items';
                        console.log("received answer for data_2 from kafka - " + dataChangedText);

                        if (dataChanged) {
                            $scope.logItems_2 = result.data;

                            $scope.chart_2.load({
                                bindto: "#timeChart_2",
                                x: 'x',
                                columns: [
                                    ['x'].concat($scope.logItems_2.map(e => new Date(e.value.timestamp))),
                                ['price'].concat($scope.logItems_2.map(e => e.value.price))
                                ]
                            });
                        }

                         setTimeout( $scope.updateGraph2(), 1000);
                    });
                };

                function filterDataWithDate(data, fromDate) {
                    for (i = 0; i < data.length; ++i) {
                        if (new Date(data[i].value.timestamp) < fromDate) {
                            data.splice(i--, 1);
                        }
                    }
                }

                //load real data asap
                $scope.fetchSellingData();

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
