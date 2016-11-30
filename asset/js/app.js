(function () {
    // vars defining the URIs of the REST-APIs
    var frontend = angular.module('frontend', [
        'ngRoute',
        'chart.js',
        'deployment',
        'log',
        'config',
        'dashboard'
        ]);

    frontend.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                // Common Views
                when('/deployment', {
                    templateUrl: 'asset/templates/deployment.html',
                    controller: 'deploymentCtrl'
                }).
                when('/log', {
                    templateUrl: 'asset/templates/log.html',
                    controller: 'logCtrl'
                }).
                when('/dashboard', {
                    templateUrl: 'asset/templates/dashboard.html',
                    controller: 'dashboardCtrl'
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
                // default Route
                otherwise({
                    redirectTo: '/deployment'
                });
        }
    ]);

    frontend.factory('socket', function ($rootScope) {

        //var socket = io.connect("", {
        //    query: 'id=mgmt-ui'
        //});

        var socket = io.connect("http://localhost:8001/", {query: 'id=mgmt-ui'});

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
