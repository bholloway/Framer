function angularCloseFrameWindow(frame) {
    var childWindow = frame.frameElement.contentWindow;
    var ngApp = childWindow.angular.element(childWindow.document.getElementById(frame.options.angularAppId));
    console.log('ngApp', ngApp);

    var injector = childWindow.angular.element(ngApp).injector();
    destroyAllScopes();

    function destroyAllScopes() {
        var rootScope = injector.get('$rootScope');
        rootScope.$broadcast("$destroy");
        setTimeout(function () {
            closeFrameWindow(frame);
        }, 0);
    }
}