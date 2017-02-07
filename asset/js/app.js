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
        //TODO: load those from config.js
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

        var productIDs                = [];

        /**
         * Highcharts Settings
         */
        Highcharts.setOptions({lang: {noData: "No data available (yet)"}});

        // Define a custom symbol paths
        Highcharts.SVGRenderer.prototype.symbols.cross = function (x, y, w, h) {
            return ['M', x, y, 'L', x + w, y + h, 'M', x + w, y, 'L', x, y + h, 'z'];
        };
        if (Highcharts.VMLRenderer) {
            Highcharts.VMLRenderer.prototype.symbols.cross = Highcharts.SVGRenderer.prototype.symbols.cross;
        }

        Highcharts.SVGRenderer.prototype.symbols.vertical_line = function (x, y, w, h) {
            return ['M', x+w/2, y-w+w/2, 'L', x+w/2, y+w+w/2, 'z'];
        };
        if (Highcharts.VMLRenderer) {
            Highcharts.VMLRenderer.prototype.symbols.vertical_line = Highcharts.SVGRenderer.prototype.symbols.vertical_line;
        }

        // Set default colors and exclude red so red is only used manually to mark selling data points
        Highcharts.theme = {
            colors: ['#BD4F00', '#540078', '#007843', '#0073A8', '#96003E', '#16008A', '#8A8700']
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
                title:      "Total Profit",
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
                getOptions: function() {return getColumnChartXDateYPriceGroupMerchantOptions(charts.revenuePerMinute.title, "Revenue per Minute");},
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
            revenuePerHour: {
                title:      "Revenue per Hour",
                html_id:    "chart-revenue-per-hour",
                data:       [],
                getOptions: function() {return getColumnChartXDateYPriceGroupMerchantOptions(charts.revenuePerHour.title, "Revenue per Hour");},
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
                title:      "Total Revenue",
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
                getOptions: function() {return getStockchartXDateYPriceOptions(charts.priceUpdatesAndSales.title, "price_and_sales", "Price", false, createPriceOrSalesUpdateTooltip());},
                updateGraphWithPriceData: function(chart, data, currentFilterID) {
                    parseBulkData(data).forEach(function(dp) {
                        productIDs.pushIfNotExist(dp.value.product_id);

                        const lineID = createLineName(dp);
                        let point = {
                            x: new Date(dp.value.timestamp).getTime(),
                            y: dp.value.price,
                            quality: dp.value.quality,
                            quality_desc: qualityToString(dp.value.quality),
                            uid: dp.value.uid,
                            product_id: dp.value.product_id,
                            merchant_name: merchants.getMerchantName(dp.value.merchant_id),
                            merchant_id: dp.value.merchant_id,
                            description: "Price Update",
                            marker: {
                                symbol: 'vertical_line',
                                lineWidth: 3
                            }
                        };

                        addPointToLine(chart, point, lineID, lineID, true);

                        dontDrawLineIfMerchantNotRegistered(chart, lineID);
                        dontDrawLineIfLineFiltered(chart, lineID, currentFilterID);

                        //console.log("Update by " + merchants.getMerchantName(dp.value.merchant_id) + ": " + dp.value.uid + " --> " + dp.value.price + "€ (at " + (new Date(dp.value.timestamp)).hhmmss() + ")");
                    });
                    chart.redraw(false);
                },
                updateGraphWithSalesData: function(chart, data, currentFilterID) {
                    parseBulkData(data).forEach(function(dp, index) {
                        if (merchants.isRegisteredMerchant(dp.value.merchant_id)) {
                            productIDs.pushIfNotExist(dp.value.product_id);

                            const lineID = createLineName(dp);
                            let point;
                            if (dp.value.left_in_stock > 0) {
                                point = {
                                    x: new Date(dp.value.timestamp).getTime(),
                                    y: dp.value.price,
                                    quality: dp.value.quality,
                                    quality_desc: qualityToString(dp.value.quality),
                                    uid: dp.value.uid,
                                    product_id: dp.value.product_id,
                                    merchant_name: merchants.getMerchantName(dp.value.merchant_id),
                                    merchant_id: dp.value.merchant_id,
                                    description: "Sold!",
                                    marker: {
                                        radius: 4
                                    }
                                };

                                addPointToLine(chart, point, lineID, lineID, true);

                                dontDrawLineIfLineFiltered(chart, lineID, currentFilterID);
                            } else {
                                point = {
                                    x: new Date(dp.value.timestamp).getTime(),
                                    y: dp.value.price,
                                    quality: dp.value.quality,
                                    quality_desc: qualityToString(dp.value.quality),
                                    uid: dp.value.uid,
                                    product_id: dp.value.product_id,
                                    merchant_name: merchants.getMerchantName(dp.value.merchant_id),
                                    merchant_id: dp.value.merchant_id,
                                    description: "Sold! Out of Stock.",
                                    marker: {
                                        symbol: 'cross',
                                        lineWidth: 3
                                    }
                                };
                                let line = addPointToLine(chart, point, lineID, lineID, true);

                                // add a null-point right after the actual point to make sure it wont be connected to the next point
                                let nullPoint = {
                                    x: new Date(dp.value.timestamp).getTime() + 1,
                                    y: null
                                };
                                // pass the line from before in case the line was created in the call before
                                addPointToLine(chart, nullPoint, lineID, lineID, true, line);

                                dontDrawLineIfLineFiltered(chart, lineID, currentFilterID);
                            }
                        }
                    });
                    chart.redraw();
                },
                filterForID: function(chart, productID) {
                    chart.series.forEach(function(serie) {
                        dontDrawLineIfLineFiltered(chart, serie.options.id, productID);
                    });

                    sortLegend(chart);

                    // redraw once at the end to avoid slow re-drawing at each series-visibility-change
                    chart.redraw();
                }
            },

            // functions that require an actual chart bound to an html-element
            setDefaultZoom: function(chart, minuteRange) {
                let d = new Date();
                chart.xAxis[0].update(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() - minuteRange), Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + minuteRange));
            },

            setSize: function(chart, width, height) {
                chart.setSize(width, height);
            },

            getCurrentProductIDs: function() {
                return productIDs;
            }
        };

        Date.prototype.hhmmss = function() {
            var hh = this.getHours();
            var mm = this.getMinutes();
            var ss = this.getSeconds();

            return [(hh>9 ? '' : '0') + hh,
                (mm>9 ? '' : '0') + mm,
                (ss>9 ? '' : '0') + ss
            ].join(':');
        };

        function addPointToLine(chart, point, lineID, lineName, stepEnabled, lineToUse) {
            let line = lineToUse ? lineToUse : chart.get(lineID);

            // create a new series/line if it is not present yet
            if (line === undefined || line === null) {
                let newLine = {
                    name: lineName ? lineName : lineID,
                    id: lineID,
                    data: [],
                    step: stepEnabled ? stepEnabled : true,
                    color: getColorForMerchantAndProduct(point.merchant_name, point.product_id, point.quality),
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
                    },
                    pricewars: {
                        quality: point.quality,
                        uid: point.uid,
                        product_id: point.product_id,
                        merchant_name: point.merchant_name,
                        merchant_id: point.merchant_id
                    }
                };
                line = chart.addSeries(newLine);
            }

            // add the new point to the line
            let shift = line.data.length > maxNumberOfPointsInLine;

            // set color of the point to the line color (has to be set for custom symbols to work)
            if (point.marker) {
                point.marker.fillColor = line.color;
                point.marker.lineColor = line.color;
            }

            line.addPoint(point, false, shift);

            return line;
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
        function dontDrawLineIfLineFiltered(chart, lineID, currentFilterID) {
            let line = chart.get(lineID);

            if (isLineFilteredForID(chart, lineID, currentFilterID)) {
                line.setVisible(true, false);
                line.options.showInLegend = true;
                chart.legend.renderItem(line);
                chart.legend.render();
            } else {
                line.setVisible(false, false);
                line.options.showInLegend = false;
                line.legendItem = null;
                chart.legend.destroyItem(line);
                chart.legend.render();
            }
        }

        function sortLegend(chart) {
            var series = chart.series;

            // sort series (first by merchant name, then by product id, then by product quality
            series.sort(function(a,b){
                if (a.options.pricewars.merchant_name == b.options.pricewars.merchant_name) {
                    if (a.options.pricewars.product_id == b.options.pricewars.product_id) {
                        return a.options.pricewars.quality > b.options.pricewars.quality ? 1 : a.options.pricewars.quality < b.options.pricewars.quality ? -1 : 0;
                    }
                    return a.options.pricewars.product_id > b.options.pricewars.product_id ? 1 : -1;
                }

                return a.options.pricewars.merchant_name > b.options.pricewars.merchant_name ? 1 : -1;
            });

            // set index
            let currentIndex = 0;
            for (var i = 0; i < series.length; i++) {
                if (series[i].visible && !series[i].name.startsWith("Navigator")) {
                    series[i].update({
                        legendIndex: currentIndex
                    }, false);
                    currentIndex++;
                }
            }
        }

        function isLineFilteredForID(chart, lineID, currentIDFilter) {
            let line = chart.get(lineID);
            return currentIDFilter == filterForAllIDs || line.options.pricewars.product_id == currentIDFilter;
        }

        function createLineName(data) {
            return "Merch: " + merchants.getMerchantName(data.value.merchant_id) + " - PUID: " + data.value.uid;
        }

        var merchantColorMapping = {};

        function getColorForMerchantAndProduct(merchant_name, product_id, product_quality) {
            if (merchantColorMapping[merchant_name]) {
                if (!merchantColorMapping[merchant_name][product_id]) merchantColorMapping[merchant_name][product_id] = {};

                // color for this product and merchant exists already
                if (merchantColorMapping[merchant_name][product_id][product_quality])
                        return merchantColorMapping[merchant_name][product_id][product_quality];

                // merchant and product is there but not the color for this quality
                merchantColorMapping[merchant_name][product_id][product_quality] = ColorLuminance(merchantColorMapping[merchant_name].base_color, product_quality / 5);
                return merchantColorMapping[merchant_name][product_id][product_quality];
            } else {
                // merchant is unknown - get new base color
                merchantColorMapping[merchant_name] = {};
                merchantColorMapping[merchant_name].base_color = Highcharts.theme.colors[Object.keys(merchantColorMapping).length - 1];
                merchantColorMapping[merchant_name][product_id] = {};
                merchantColorMapping[merchant_name][product_id][product_quality] = ColorLuminance(merchantColorMapping[merchant_name].base_color, product_quality / 5);
                return merchantColorMapping[merchant_name][product_id][product_quality];
            }
        }

        // Changes the given color to have additional lum-luminance (eg 0.2 for 20% lighter)
        function ColorLuminance(hex, lum) {
            // validate hex string
            hex = String(hex).replace(/[^0-9a-f]/gi, '');
            if (hex.length < 6) {
                hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            }
            lum = lum || 0;

            // convert to decimal and change luminosity
            var rgb = "#", c, i;
            for (i = 0; i < 3; i++) {
                c = parseInt(hex.substr(i*2,2), 16);
                c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
                rgb += ("00"+c).substr(c.length);
            }

            return rgb;
        }

        function qualityToString(quality) {
            switch (quality) {
                case 1: return "1 (best)";
                case 2: return "2 (good)";
                case 3: return "3 (okay)";
                case 4: return "4 (bad)";
                default: return quality;
            }
        }

        function parseBulkData(newData) {
            var data = newData;
            if (!(newData instanceof Array)) {
                data = [newData]
            } else {
                data = newData.map(e => {return angular.fromJson(e)})
            }
            return data;
        }

        function createPriceOrSalesUpdateTooltip() {
            return '<table>' +
                        '<tr><td style="text-align: right"><b>Merchant:&nbsp; &nbsp;</b></td><td style="text-align: left"><b>{point.merchant_name}</b></td></tr>' +
                        '<tr><td style="text-align: right"><b>Action:&nbsp; &nbsp;</b></td><td style="text-align: left">{point.description}</td></td>' +
                        '<tr><td style="text-align: right"><b>ProductID:&nbsp; &nbsp;</b></td><td style="text-align: left">{point.product_id}</td></tr>' +
                        '<tr><td style="text-align: right"><b>Quality:&nbsp; &nbsp;</b></td><td style="text-align: left">{point.quality_desc}</td></tr>' +
                        '<tr><td style="text-align: right"><b>Price:&nbsp; &nbsp;</b></td><td style="text-align: left">{point.y:.2f}€</td></tr>' +
                   '</table>';
        }

        function getStockchartXDateYPriceOptions(title, id, y_axis_title, add_empty_series, customTooltip) {
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
                    enabled: true,
                    maxHeight: 100
                },
                tooltip: {
                    useHTML: true,
                    pointFormat: customTooltip ? customTooltip : '<b>{series.name}:</b> {point.y:.2f}€'
                },
                series: []
            };

            if (add_empty_series) {
                result.series.push({
                    lineWidth: 0,
                    name: id,
                    id: id,
                    marker: {
                        enabled: true,
                        radius: 4,
                        symbol: 'circle'
                    },
                    states: {
                        hover: {
                            lineWidthPlus: 0
                        }
                    },
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
