(function () {
    var lg = angular.module('log', ['ngCookies']);

    lg.controller('logCtrl', ['$routeParams', '$location', '$http', '$scope', '$cookieStore', '$window', '$filter', '$rootScope',
            function ($routeParams, $location, $http, $scope, $cookieStore, $window, $filter, $rootScope) {

                $scope.marketplace_url       = "http://vm-mpws2016hp1-04.eaalab.hpi.uni-potsdam.de:8080/marketplace/";
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

                $scope.fetchLog = function(){
                    $("#loadingModal").modal("show");
                    $http.get($scope.kafka_restful_service+'log/sales').then((result) => {
                        $scope.logOutput = JSON.stringify(result.data);
                        $("#loadingModal").modal("hide");
                    })
                }

                $scope.search = function(searchTerm){
                    //TODO: implement searching for logs
                }

            }] //END: controller function
    );  // END: dashboardController
})(); //END: global function
