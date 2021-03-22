// @ts-nocheck

//Private variables
var currentAlarmsRunnedCount = 0;
var problemsOcurredOnDoSalesRequest = false;
var problemsOcurredOnDoReviewsRequest = false;

//----- Starting functions ------

//Function that start the background service
function StartBackgroundService() {
    //Get current date
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var time = today.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");

    //Create the basics settings, if not have yet
    if (localStorage.getItem("delayBetweenUpdates") == null)
        localStorage.setItem("delayBetweenUpdates", "30");
    if (localStorage.getItem("showNotificationOnStart") == null)
        localStorage.setItem("showNotificationOnStart", "false");

    //Notify the start, if is enabled
    if (localStorage.getItem("showNotificationOnStart") == "true")
        chrome.notifications.create("",
            {
                type: "basic",
                iconUrl: "../img/icon128.png",
                title: "Publisher Tools For Asset Store",
                message: "The Background Service of this Extension is running!"
            },
            function () { });

    //Register a new alarm to run periodics updates, register the receiver too
    chrome.alarms.create("OnRunNewUpdateOfService", {
        delayInMinutes: 1,
        periodInMinutes: 1
    });
    chrome.alarms.onAlarm.addListener(function (alarm) {
        if (alarm.name === "OnRunNewUpdateOfService") {
            //If alarm count is in the desired delay between updates, run the update of service and reset counter
            if (currentAlarmsRunnedCount >= parseInt(localStorage.getItem("delayBetweenUpdates"), 10)) {
                OnRunNewUpdateOfService();

                //Reset the currentAlarmsRunnedCount
                currentAlarmsRunnedCount = 0;
            }

            //Increase runs of alarm count
            currentAlarmsRunnedCount += 1;
        }
    });

    //Register a lister for receive all types of messages
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "StartBackgroundService")
                StartBackgroundService();

            if (request.msg == "OnRunNewUpdateOfService")
                OnRunNewUpdateOfService();
        }
    );

    //Set default color for badges of this extension
    chrome.browserAction.setBadgeBackgroundColor({ color: [190, 0, 0, 255] });

    //Call OnRunNewUpdateOfService to run first update
    OnRunNewUpdateOfService();

    //Notify this start on console
    console.log("The Service Was Started In " + dd + "/" + mm + " " + time + ".");
}

//Start the background service
StartBackgroundService();

//------- Core function ---------

//Function that runs on each update of service
function OnRunNewUpdateOfService() {
    //Get current date
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yy = today.getFullYear();
    var time = today.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");

    //If publisher not provided needed information yet, cancel this update
    if (localStorage.getItem("publisherId") == null || localStorage.getItem("reviewsRss") == null) {
        chrome.browserAction.setBadgeText({ text: 'Login' });
        return;
    }

    //-------------- Do a HTTP Request to process Sales -------------
    var httpSalesRequest = new XMLHttpRequest();
    httpSalesRequest.onreadystatechange = function () {
        //On done loading
        if (this.readyState == 4) {
            //On success
            if (this.status == 200) {
                //Notify the success to the PopUp interface and the Badge of extension
                chrome.runtime.sendMessage({ msg: "ReportDoneLoadingSalesData", errorOcurred: "false" });
                problemsOcurredOnDoSalesRequest = false;
                ShowOrHideBadgeIfOcurredErrorOnSomeRequest();

                console.log("sales done");
            }
            //On fail
            if (this.status != 200) {
                //Notify the fail to the PopUp interface and the Badge of extension
                chrome.runtime.sendMessage({ msg: "ReportDoneLoadingSalesData", errorOcurred: "true" });
                problemsOcurredOnDoSalesRequest = true;
                ShowOrHideBadgeIfOcurredErrorOnSomeRequest();
            }
        }
    };
    httpSalesRequest.open("GET", "https://publisher.assetstore.unity3d.com/api/publisher-info/sales/" + localStorage.getItem("publisherId") + "/" + yy + mm + ".json", true);
    httpSalesRequest.withCredentials = true;
    httpSalesRequest.send();

    //-------------- Do a HTTP Request to process Reviews -------------
    var httpReviewsRequest = new XMLHttpRequest();
    httpReviewsRequest.onreadystatechange = function () {
        //On done loading
        if (this.readyState == 4) {
            //On success
            if (this.status == 200) {
                //Notify the success to the PopUp interface and the Badge of extension
                chrome.runtime.sendMessage({ msg: "ReportDoneLoadingReviewsData", errorOcurred: "false" });
                problemsOcurredOnDoReviewsRequest = false;
                ShowOrHideBadgeIfOcurredErrorOnSomeRequest();

                console.log("reviews done");
            }
            //On fail
            if (this.status != 200) {
                //Notify the fail to the PopUp interface and the Badge of extension
                chrome.runtime.sendMessage({ msg: "ReportDoneLoadingReviewsData", errorOcurred: "true" });
                problemsOcurredOnDoReviewsRequest = true;
                ShowOrHideBadgeIfOcurredErrorOnSomeRequest();
            }
        }
    };
    httpReviewsRequest.open("GET", localStorage.getItem("reviewsRss"), true);
    httpReviewsRequest.withCredentials = true;
    httpReviewsRequest.send();

    //Notify this update on console
    console.log("New Update Of Service Was Runned In " + dd + "/" + mm + " " + time + ".");
}

//Function that show or hide the badge, if ocurred problems on some http request
function ShowOrHideBadgeIfOcurredErrorOnSomeRequest() {
    //Show or hide the badge, if ocurred problems on some Http request
    if (problemsOcurredOnDoSalesRequest == true || problemsOcurredOnDoReviewsRequest == true)
        chrome.browserAction.setBadgeText({ text: 'Error' });
    if (problemsOcurredOnDoSalesRequest == false && problemsOcurredOnDoReviewsRequest == false)
        chrome.browserAction.setBadgeText({ text: '' });
}

















/*

//----- Important functions ------
//Function that post process the response returned from sales API in GetSalesAndNotifyIfHaveNew
function ProcessResponseFromUnitySalesAPI(responseText) {
    //Get converted data in json
    var jsonData = JSON.parse(responseText);
    //Get current date
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var time = today.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");

    //Process sales data for each product
    var allProducts = jsonData.aaData;
    var allResults = jsonData.result;
    for (var i = 0; i < allProducts.length; i++) {
        var productName = allProducts[i][0];
        var productPrice = allProducts[i][1];
        var productSales = allProducts[i][2];
        var productRefunds = allProducts[i][3];
        var productChargebacks = allProducts[i][4];
        var productGrossSales = allProducts[i][5];
        var productFirstSale = allProducts[i][6];
        var productLastSale = allProducts[i][7];
        var productNetSales = allResults[i].net;
        var productShortUrl = allResults[i].short_url;

        //Save data for this asset
        localStorage.setItem(productName + " (Sales)", '{"lastSales":"' + productSales + '", "lastCheck":"' + dd + "/" + mm + "-" + time + '"}');
    }
}*/