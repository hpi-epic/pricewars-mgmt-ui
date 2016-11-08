(function () {
    // vars defining the URIs of the REST-APIs
    var frontend = angular.module('frontend', [
        'ngRoute',
        'chart.js',
        'deployment',
        'log'
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
                // default Route
                otherwise({
                    redirectTo: '/deployment'
                });
        }
    ]);
})();
