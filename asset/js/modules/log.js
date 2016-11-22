(function () {
    var lg = angular.module('log', ['ngCookies']);

    lg.controller('logCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

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
                
                $scope.fetchLog = () => {
                    $http.get('http://vm-mpws2016hp1-06.eaalab.hpi.uni-potsdam.de/settings').then((result) => {
                        $scope.logOutput = JSON.stringify(result.data)
                    })
                }

                $scope.fetchSellingData = () => {
                    $http.get('http://vm-mpws2016hp1-05.eaalab.hpi.uni-potsdam.de/log/sales').then((result) => {
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
                    })
                }
                $scope.fetchSellingData()

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
