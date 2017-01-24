(function () {
    var da = angular.module('dashboard', ['ngCookies']);

    da.controller('dashboardCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope', 'merchants',
        function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope, merchants) {

            const maxNumberOfPointsInLine  = 10000;

            $scope.marketplace_url         = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace";

            $scope.liveGraphData = [];
            $scope.merchants     = merchants.get();
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
             * Initializing Graphs
             */

            $scope.drawStockGraphs = function() {
                const graphNames = ["liveSales"];
                angular.forEach(graphNames, function (value, key) {
                    $scope.charts[value] = Highcharts.stockChart('chart-' + value, {
                        title: {
                            text: value
                        },
                        xAxis: {
                            type: 'datetime',
                            title: {
                                text: 'Date'
                            },
                            ordinal: false
                        },
                        yAxis: {
                            title: {
                                text: value
                            },
                            opposite: false
                        },
                        rangeSelector: {
                            buttons: [{
                                count: 30,
                                type: 'second',
                                text: '30S'
                            }, {
                                count: 1,
                                type: 'minute',
                                text: '1M'
                            }, {
                                count: 5,
                                type: 'minute',
                                text: '5M'
                            }, {
                                count: 30,
                                type: 'minute',
                                text: '30M'
                            }, {
                                count: 1,
                                type: 'hour',
                                text: '1H'
                            }, {
                                type: 'all',
                                text: 'All'
                            }],
                            inputEnabled: false,
                            selected: 5
                        },
                        legend: {
                            enabled: true
                        },
                        series: [{
                            name: value,
                            id: value,
                            data: []
                        }]
                    });
                });
            };

            $scope.drawBarGraphs = function() {
                const graphNames = ["revenue"];
                angular.forEach(graphNames, function(value, key) {
                    $scope.charts[value] = Highcharts.chart('chart-' + value, {
                        chart: {
                            type: 'column',
                            zoomType: 'x'
                        },
                        title: {
                            text: value
                        },
                        xAxis: {
                            type: 'datetime',
                            title: {
                                text: 'Date'
                            },
                            showEmpty: false
                        },
                        yAxis: {
                            title: {
                                text: value
                            }
                        },
                        legend: {
                            //reversed: true,
                            enabled: true,
                            labelFormat: 'Merchant {name}'
                        },
                        tooltip: {
                            headerFormat: '<b>{point.x:%b %e, %Y %H:%M}</b><br/>',
                            pointFormat: '<b>Merchant {series.name}:</b> {point.y:.2f}'
                        },
                        scrollbar: {
                            enabled: true
                        },
                        series: []
                    });

                    // set default zoom
                    var d = new Date();
                    $scope.charts[value].xAxis[0].update(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() - 10), Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + 10));

                    // set height
                    $scope.charts[value].setSize(undefined, 500);
                });
            };

            $scope.drawStackedBarGraphs = function() {
                const graphNames = ["marketshare"];
                angular.forEach(graphNames, function(value, key) {
                    $scope.charts[value] = Highcharts.chart('chart-' + value, {
                        chart: {
                            type: 'column',
                            zoomType: 'x'
                        },
                        title: {
                            text: value
                        },
                        xAxis: {
                            type: 'datetime',
                            title: {
                                text: 'Date'
                            }
                        },
                        yAxis: {
                            title: {
                                text: value
                            },
                            labels: {
                                format: '{value}%'
                            },
                            ceiling: 100,
                            stackLabels: {
                                enabled: false,
                                style: {
                                    fontWeight: 'bold',
                                    color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray',
                                    format: '{value:.2f}%'
                                }
                            }
                        },
                        legend: {
                            //reversed: true,
                            enabled: true,
                            labelFormat: 'Merchant {name}'
                        },
                        plotOptions: {
                            column: {
                                stacking: 'percent'
                            }
                        },
                        tooltip: {
                            pointFormat: '<b>Merchant {series.name}:</b> {point.y:.2f}%'
                        },
                        scrollbar: {
                            enabled: true
                        },
                        series: []
                    });

                    // set default zoom
                    var d = new Date();
                    $scope.charts[value].xAxis[0].update(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() - 10), Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + 10));

                    // set height
                    $scope.charts[value].setSize(undefined, 500);
                });
            };

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

            $scope.arraysEqual = function(arr1, arr2) {
                if (arr1.length !== arr2.length)
                    return false;
                for (var i = arr1.length; i--;) {
                    if (arr1[i] !== arr2[i])
                        return false;
                }
                return true;
            };

            $scope.drawStockGraphs();
            $scope.drawBarGraphs();
            $scope.drawStackedBarGraphs();

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
