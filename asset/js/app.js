(function () {
    // vars defining the URIs of the REST-APIs
    var frontend = angular.module('frontend', [
        'ngRoute',
        'chart.js',
        'deployment',
        'log',
        'config',
        'dashboard',
        'prices'
        ]);

    frontend.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/deployment', {
                    templateUrl: 'asset/templates/deployment.html',
                    controller: 'deploymentCtrl'
                }).
                when('/log', {
                    templateUrl: 'asset/templates/log.html',
                    controller: 'logCtrl'
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
                when('/config/time', {
                    templateUrl: 'asset/templates/time.html',
                    controller: 'timeCtrl'
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

    frontend.factory('socket', function ($rootScope) {
        var socket = io.connect("http://192.168.31.91:8001/", {query: 'id=mgmt-ui'});

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
    });
})();
