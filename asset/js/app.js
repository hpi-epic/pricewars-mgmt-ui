(function () {
    // vars defining the URIs of the REST-APIs
    var frontend = angular.module('frontend', [
        'ngRoute',
        'chart.js',
        'deployment',
        'config',
        'dashboard',
        'prices',
        'data'
        ]);

    frontend.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/deployment', {
                    templateUrl: 'asset/templates/deployment.html',
                    controller: 'deploymentCtrl'
                }).
                when('/dashboard/overview', {
                    templateUrl: 'asset/templates/dashboard.html',
                    controller: 'dashboardCtrl'
                }).
                when('/dashboard/prices', {
                    templateUrl: 'asset/templates/prices.html',
                    controller: 'pricesCtrl'
                }).
                when('/config/merchant', {
                    templateUrl: 'asset/templates/merchant.html',
                    controller: 'merchantCtrl'
                }).
                when('/config/consumer', {
                    templateUrl: 'asset/templates/consumer.html',
                    controller: 'consumerCtrl'
                }).
                when('/config/producer', {
                    templateUrl: 'asset/templates/producer.html',
                    controller: 'producerCtrl'
                }).
                when('/config/marketplace', {
                    templateUrl: 'asset/templates/marketplace.html',
                    controller: 'marketplaceCtrl'
                }).
                when('/config/global', {
                    templateUrl: 'asset/templates/global.html',
                    controller: 'globalCtrl'
                }).
                when('/data/export', {
                    templateUrl: 'asset/templates/export.html',
                    controller: 'exportCtrl'
                }).
                otherwise({
                    redirectTo: '/deployment'
                });
        }
    ]);

    frontend.directive('onFinishRender', function ($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                if (scope.$last === true) {
                    $timeout(function () {
                        scope.$emit(attr.onFinishRender);
                    });
                }
            }
        }
    });

    frontend.factory('endpoints', function () {
        return {
            marketplace_url : "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace",
            producer_url    : "http://vm-mpws2016hp1-03.eaalab.hpi.uni-potsdam.de",
            consumer_url    : "http://vm-mpws2016hp1-01.eaalab.hpi.uni-potsdam.de",
            kafka_proxy     : "http://192.168.31.91:8001/"
        };
    });

    frontend.factory('socket', ['endpoints', function (endpoints) {
        var socket = io.connect(endpoints.kafka_proxy, {query: 'id=mgmt-ui'});

        return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },
            emit: function (eventName, data, callback) {
                socket.emit(eventName, data, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        if (callback) {
                            callback.apply(socket, args);
                        }
                    });
                })
            }
        };
    }]);

    // The merchant service. Stores all merchants currently registered
    // at the marketplace and if requested, updates them periodically (not by default).
    frontend.factory('merchants', ['$http', 'endpoints', function ($http, endpoints) {

        var timeoutObj  = undefined;
        var timeout     = -1;

        var merchants   = {};

        function getMerchants() {
            $http.get(endpoints.marketplace_url + "/merchants")
                .then(function(response) {
                    for (var key in response.data) {
                        if (response.data.hasOwnProperty(key)) {
                            var merchant = response.data[key];
                            var merchantID = -1;
                            for (var merch_key in merchant) {
                                if (merch_key == "merchant_id") {
                                    merchantID = merchant[merch_key];
                                    delete(merchant[merch_key]);
                                }
                            }
                            merchants[merchantID] = merchant;
                        }
                    }
                    getMerchantDetails();

                    // check for merchants every x seconds
                    if (timeoutObj) clearTimeout(timeoutObj);
                    if (timeout > 0) timeoutObj = setTimeout(getMerchants, timeout);
                });
        }

        function getMerchantDetails() {
            for (var merchantID in merchants) {
                (function(merchant_id) {
                    $http.get(merchants[merchant_id]["api_endpoint_url"] + "/settings")
                        .then(function(response) {
                            Object.keys(response.data).sort().forEach(function(key) {
                                if (key != "merchant_id" && key != "merchant_url") {
                                    merchants[merchant_id][key] = response.data[key];
                                }
                            });
                        });
                })(merchantID);
            }
        }

        getMerchants();

        return {
            get: function(merchant_id) {
                if (merchant_id) {
                    return merchants[merchant_id];
                }
                return merchants;
            },
            getMerchantName: function(merchant_id) {
                return ((merchant_id in merchants) && merchants[merchant_id].merchant_name) ? merchants[merchant_id].merchant_name : merchant_id.substring(0, 8);
            },
            getMerchantNames: function() {
                var result = [];
                for (var id in merchants) {
                    if (merchants.hasOwnProperty(id)) {
                        result.push(merchants[id].merchant_name);
                    }
                }
                return result;
            },
            isRegisteredMerchant: function(merchant_id) {
                return (merchant_id in merchants);
            },
            setMerchantCheckTimeout: function(newTimeout) {
                timeout = newTimeout;
            },
            enablePeriodicMerchantUpdate: function(enable, newTimeout) {
                if (enable) {
                    if (timeoutObj) clearTimeout(timeoutObj);
                    if (newTimeout) {
                        timeout = newTimeout;
                    } else if (timeout < 1) {
                        timeout = 10000;
                    }
                    timeoutObj = setTimeout(getMerchants, timeout);
                } else {
                    if (timeoutObj) clearTimeout(timeoutObj);
                    timeout = -1;
                }
            },
            updateMerchants: function() {
                if (timeoutObj) clearTimeout(timeoutObj);
                getMerchants();
            }
        };
    }]);

    frontend.factory('charts', ['endpoints', 'socket', 'merchants', function (endpoints, socket, merchants) {

        const maxNumberOfPointsInLine  = 10000;
        const filterForAllIDs          = "ALL";

        var productUIDs                = [];

        /**
         * Highcharts Settings
         */
        Highcharts.setOptions({lang: {noData: "No data available (yet)"}});

        // Define a custom cross symbol path
        Highcharts.SVGRenderer.prototype.symbols.cross = function (x, y, w, h) {
            return ['M', x, y, 'L', x + w, y + h, 'M', x + w, y, 'L', x, y + h, 'z'];
        };
        if (Highcharts.VMLRenderer) {
            Highcharts.VMLRenderer.prototype.symbols.cross = Highcharts.SVGRenderer.prototype.symbols.cross;
        }

        // Set default colors and exclude red so red is only used manually to mark selling data points
        Highcharts.theme = {
            colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9',
                '#d05bf0', '#e4d354', '#116d01',  '#2b908f', '#91e8e1']
        };
        Highcharts.setOptions(Highcharts.theme);

        Array.prototype.pushIfNotExist = function(element) {
            if (this.indexOf(element) === -1) {
                this.push(element);
            }
            this.sort();
        };

        /**
         * Chart Functions
         */
        var charts = {
            liveSales: {
                title:      "Live Sales",
                html_id:    "chart-liveSales",
                data:       [],
                getOptions: function() {return getStockchartXDateYPriceOptions(charts.liveSales.title, "liveSales", "Price", true);},
                updateGraphWithData: function(chart, data) {
                    parseBulkData(data).forEach(function(dp) {
                        const point = [new Date(dp.value.timestamp).getTime(), dp.value.price];
                        const lineID = "liveSales";

                        addPointToLine(chart, point, lineID, "livesales");
                    });
                    chart.redraw();
                }
            },
            revenue: {
                title:      "Revenue",
                html_id:    "chart-revenue",
                data:       [],
                getOptions: function() {return getColumnChartXDateYPriceGroupMerchantOptions(charts.revenue.title, "Revenue");},
                updateGraphWithData: function(chart, data) {
                    parseBulkData(data).forEach(function(dp) {
                        let date = new Date(dp.value.timestamp);
                        date.setMilliseconds(0);

                        const lineID = dp.value.merchant_id;
                        const lineName = merchants.getMerchantName(lineID);
                        const point = [date.getTime(), dp.value.revenue];

                        addPointToLine(chart, point, lineID, lineName);

                        dontDrawLineIfMerchantNotRegistered(chart, lineID);
                    });
                    chart.redraw();
                }
            },
            revenuePerMinute: {
                title:      "Revenue per Minute",
                html_id:    "chart-revenue-per-minute",
                data:       [],
                getOptions: function() {return getColumnChartXDateYPriceGroupMerchantOptions(charts.revenue.title, "Revenue per Minute");},
                updateGraphWithData: function(chart, data) {
                    parseBulkData(data).forEach(function(dp) {
                        let date = new Date(dp.value.timestamp);
                        date.setMilliseconds(0);

                        const lineID = dp.value.merchant_id;
                        const lineName = merchants.getMerchantName(lineID);
                        const point = [date.getTime(), dp.value.revenue];

                        addPointToLine(chart, point, lineID, lineName);

                        dontDrawLineIfMerchantNotRegistered(chart, lineID);
                    });
                    chart.redraw();
                }
            },
            marketshare: {
                title:      "Marketshare per Minute",
                html_id:    "chart-marketshare",
                data:       [],
                getOptions: function() {return getStackedChartXDateYPercentGroupMerchantOptions(charts.marketshare.title, "Marketshare in %");},
                updateGraphWithData: function(chart, data) {
                    parseBulkData(data).forEach(function(dp) {
                        let date = new Date(dp.value.timestamp);
                        date.setMilliseconds(0);

                        const lineID = dp.value.merchant_id;
                        const lineName = merchants.getMerchantName(lineID);
                        const point = [date.getTime(), dp.value.marketshare * 100];

                        addPointToLine(chart, point, lineID, lineName);

                        dontDrawLineIfMerchantNotRegistered(chart, lineID);
                    });
                    chart.redraw();
                }
            },
            priceUpdatesAndSales: {
                title:      "Price Updates and Item Sales",
                html_id:    "highchart-price_and_sales",
                data:       [],
                getOptions: function() {return getStockchartXDateYPriceOptions(charts.priceUpdatesAndSales.title, "price_and_sales", "Price", false);},
                updateGraphWithPriceData: function(chart, data, currentFilter) {
                    parseBulkData(data).forEach(function(dp) {
                        productUIDs.pushIfNotExist(dp.value.uid);

                        const lineName = createLineName(dp);
                        const lineID = dp.value.merchant_id;
                        let point = [new Date(dp.value.timestamp).getTime(), dp.value.price];

                        addPointToLine(chart, point, lineID, lineName, true);

                        dontDrawLineIfMerchantNotRegistered(chart, lineID);
                        dontDrawLineIfLineFiltered(chart, lineID, currentFilter);
                    });
                    chart.redraw(false);
                },
                updateGraphWithSalesData: function(chart, data, currentFilter) {
                    parseBulkData(data).forEach(function(dp, index) {
                        if (merchants.isRegisteredMerchant(dp.value.merchant_id)) {
                            productUIDs.pushIfNotExist(dp.value.uid);

                            const lineName = createLineName(dp);
                            const lineID = dp.value.merchant_id
                            let point;
                            if (dp.value.left_in_stock > 0) {
                                point = {
                                    x: new Date(dp.value.timestamp).getTime(),
                                    y: dp.value.price,
                                    marker: {fillColor: '#d60000', radius: 4}
                                };

                                addPointToLine(chart, point, lineID, lineName, true);

                                dontDrawLineIfLineFiltered(chart, lineID, currentFilter);
                            } else {
                                point = {
                                    x: new Date(dp.value.timestamp).getTime(),
                                    y: dp.value.price,
                                    marker: {
                                        fillColor: '#d60000',
                                        symbol: 'cross',
                                        lineColor: '#d60000',
                                        lineWidth: 3
                                    }
                                };
                                line = addPointToLine(chart, point, lineID, lineName, true);

                                // add a null-point right after the actual point to make sure it wont be connected to the next point
                                let nullPoint = {
                                    x: new Date(dp.value.timestamp).getTime() + 1,
                                    y: null
                                };
                                // pass the line from before in case the line was created in the call before
                                line = addPointToLine(chart, point, lineID, lineName, true, line);

                                dontDrawLineIfLineFiltered(chart, lineID, currentFilter);
                            }
                        }
                    });
                    chart.redraw();
                },
                filterForUID: function(chart, productUID) {
                    chart.series.forEach(function(serie) {
                        if (isLineFilteredForUID(chart, serie.options.id, productUID)) {
                            serie.setVisible(true, false);
                        } else {
                            serie.setVisible(false, false);
                        }
                    });

                    // redraw once at the end to avoid slow re-drawing at each series-visibility-change
                    chart.redraw();
                },
                filterForMerchant: function(chart, merchant_name) {
                    chart.series.forEach(function(serie) {
                        if (isLineFilteredForMerchant(chart, serie.options.id, merchant_name)) {
                            serie.setVisible(true, false);
                        } else {
                            serie.setVisible(false, false);
                        }
                    });

                    // redraw once at the end to avoid slow re-drawing at each series-visibility-change
                    chart.redraw();
                }
            },
            priceUpdates: {
                title:      "Price Updates",
                html_id:    "highchart-price",
                data:   [],
                getOptions: function() {return getStockchartXDateYPriceOptions(charts.priceUpdates.title, "price", "Price", false);}
            },
            priceUpdatesPerMerchant: {
                title:      function(merchant_name) {return "Price Updates of Merchant " + merchant_name;},
                html_id:    function(merchant_id) {return "highchart-price-" + merchant_id;},
                data:       [],
                getOptions: function(title) {return getStockchartXDateYPriceOptions(title, "price_per_merchant", "Price", false);}
            },

            // functions that require an actual chart bound to an html-element
            setDefaultZoom: function(chart, minuteRange) {
                let d = new Date();
                chart.xAxis[0].update(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() - minuteRange), Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + minuteRange));
            },

            setSize: function(chart, width, height) {
                chart.setSize(width, height);
            },

            getCurrentProductUIDs: function() {
                return productUIDs;
            }
        };

        function addPointToLine(chart, point, lineID, lineName, stepEnabled, lineToUse) {
            let line = lineToUse ? lineToUse : chart.get(lineID);

            // create a new series/line if it is not present yet
            if (line === undefined || line === null) {
                let dashStyle = 'Solid';
                if (chart.series.length >= Highcharts.theme.colors.length) dashStyle = 'LongDash';
                let newLine = {
                    name: lineName ? lineName : lineID,
                    id: lineID,
                    data: [],
                    step: stepEnabled ? stepEnabled : false,
                    dashStyle: dashStyle,
                    lineWidth: 2,
                    marker: {
                        enabled: true,
                        radius: 4,
                        symbol: 'circle'
                    },
                    states: {
                        hover: {
                            lineWidthPlus: 2
                        }
                    }
                };
                line = chart.addSeries(newLine);
            }

            // add the new point to the line
            let shift = line.data.length > maxNumberOfPointsInLine;
            line.addPoint(point, false, shift);
        }

        function dontDrawLineIfMerchantNotRegistered(chart, lineID) {
            let line = chart.get(lineID);

            // only show the line if it belongs to a currently active merchant
            if (merchants.isRegisteredMerchant(lineID)) {
                line.setVisible(true, false);
            } else {
                line.setVisible(false, false);
            }
        }

        // make sure to call after dontDrawLineIfMerchantNotRegistered or else effect might be overwritten
        function dontDrawLineIfLineFiltered(chart, lineID, currentFilter) {
            let line = chart.get(lineID);

            if (isLineFiltered(chart, lineID, currentFilter)) {
                line.setVisible(true, false);
            } else {
                line.setVisible(false, false);
            }
        }

        function isLineFilteredForUID(chart, lineID, currentFilter) {
            let line = chart.get(lineID);
            return line.name.includes('PID: ' + currentFilter) || currentFilter == filterForAllIDs;
        }

        function isLineFilteredForMerchant(chart, lineID, merchant_name) {
            let line = chart.get(lineID);
            return line.name.includes('- M: ' + merchant_name) || merchant_name == filterForAllIDs;
        }

        function createLineName(data) {
            return "PID: " + data.value.uid + " - M: " + merchants.getMerchantName(data.value.merchant_id);
        }

        function parseBulkData(newData) {
            var data = newData;
            if (!(newData instanceof Array)) {
                data = [newData]
            } else {
                data = newData.map(e => {return angular.fromJson(e)}
            )
            }
            return data;
        }

        function getStockchartXDateYPriceOptions(title, id, y_axis_title, add_empty_series) {
            var result = {
                title: {
                    text: title
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
                        text: y_axis_title
                    },
                    opposite: false
                },
                rangeSelector: {
                    buttons: [{
                        count: 10,
                        type: 'second',
                        text: '10S'
                    }, {
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
                    selected: 6
                },
                legend: {
                    enabled: true
                },
                tooltip: {
                    pointFormat: '<b>{series.name}:</b> {point.y:.2f}€'
                },
                series: []
            };

            if (add_empty_series) {
                result.series.push({
                    name: id,
                    id: id,
                    data: []
                });
            }

            return result;
        }

        function getColumnChartXDateYPriceGroupMerchantOptions(title, y_axis_title) {
            return {
                chart: {
                    type: 'column',
                    zoomType: 'x'
                },
                title: {
                    text: title
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
                        text: y_axis_title
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
            };
        }

        function getStackedChartXDateYPercentGroupMerchantOptions(title, y_axis_title) {
            return {
                chart: {
                    type: 'column',
                    zoomType: 'x'
                },
                title: {
                    text: title
                },
                xAxis: {
                    type: 'datetime',
                    title: {
                        text: 'Date'
                    }
                },
                yAxis: {
                    title: {
                        text: y_axis_title
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
            };
        }

        return charts;
    }]);
})();
