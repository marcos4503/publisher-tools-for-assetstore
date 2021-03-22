// @ts-nocheck

//Private variables
var doneLoadingSalesData = false;
var doneLoadingReviewsData = false;
var haveErrorOnGetSalesInfo = false;
var haveErrorOnGetReviewsInfo = false;

//------ Starting functions ------

//Function that start popup service
function StartPopUpService() {
    //Register a lister for receive all types of messages
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.msg == "StartPopUpService")
                StartPopUpService();

            if (request.msg == "RenderOrUpdatePopUpContent")
                RenderOrUpdatePopUpContent();

            if (request.msg == "ReportDoneLoadingSalesData")
                ReportDoneLoadingSalesData((request.errorOcurred == "true") ? true : false);

            if (request.msg == "ReportDoneLoadingReviewsData")
                ReportDoneLoadingReviewsData((request.errorOcurred == "true") ? true : false);
        }
    );

    //Force service to run a new update that will inform this popup on end
    chrome.runtime.sendMessage({ msg: "OnRunNewUpdateOfService" });

    //Run the first renderer of popup content after created all HTML dom of popup
    window.onload = function () {
        RenderOrUpdatePopUpContent();
    }
}

//Start the popup service
StartPopUpService();

//------- Core functions ---------

//Function that render or update content of popup
function RenderOrUpdatePopUpContent() {
    //If not provided the needed data yet, show popup to register all needed data and return
    if (localStorage.getItem("publisherId") == null || localStorage.getItem("reviewsRss") == null) {
        document.getElementById("loginPopUpBgNode").setAttribute("style", "pointer-events: all; opacity: 0.5;");
        document.getElementById("loginPopUpBaseNode").setAttribute("style", "pointer-events: all; opacity: 1.0;");

        //Create temporary publisher data, if not have yet
        if (localStorage.getItem("temp_publisherId") == null)
            localStorage.setItem("temp_publisherId", "");
        if (localStorage.getItem("temp_reviewsRss") == null)
            localStorage.setItem("temp_reviewsRss", "");

        //Get fields
        var publisherId = document.getElementById("loginPublisherId");
        var reviewsRss = document.getElementById("loginReviewsRss");
        publisherId.value = localStorage.getItem("temp_publisherId");
        reviewsRss.value = localStorage.getItem("temp_reviewsRss");

        //Save all typed on login fields on temporary storage
        publisherId.addEventListener("input", function () {
            localStorage.setItem("temp_publisherId", publisherId.value);
        });
        reviewsRss.addEventListener("input", function () {
            localStorage.setItem("temp_reviewsRss", reviewsRss.value);
        });

        //Register listener to Save button
        document.getElementById("loginButton").addEventListener("click", function () {
            //Show errors
            publisherId.style.borderColor = (publisherId.value == "") ? "red" : "";
            reviewsRss.style.borderColor = (reviewsRss.value == "") ? "red" : "";

            //If is empty, return
            if (publisherId.value == "" || reviewsRss.value == "")
                return;

            //Save data
            localStorage.setItem("publisherId", publisherId.value);
            localStorage.setItem("reviewsRss", reviewsRss.value);
            localStorage.removeItem("temp_publisherId");
            localStorage.removeItem("temp_reviewsRss");

            //Hide login popup
            document.getElementById("loginPopUpBgNode").setAttribute("style", "pointer-events: none; opacity: 0;");
            document.getElementById("loginPopUpBaseNode").setAttribute("style", "pointer-events: none; opacity: 0;");

            //Force service to run a new update that will inform this popup on end
            chrome.runtime.sendMessage({ msg: "OnRunNewUpdateOfService" });
        });
        return;
    }

    //If not done loading of sales and reviews, return
    if (doneLoadingSalesData == false || doneLoadingReviewsData == false)
        return;

    //Hide the loading screen
    var loadingScreen = document.getElementById("loadingScreenNode");
    loadingScreen.setAttribute("style", "opacity: 0; pointer-events: none;");

    //If have errors on load reviews or sales, show notification
    if (haveErrorOnGetSalesInfo == true || haveErrorOnGetReviewsInfo == true) {
        document.getElementById("getDataErrorMessage").setAttribute("style", "opacity: 1; display: block;");
        document.getElementById("allOkMessage").style.opacity = "1";
        setTimeout(function () {
            document.getElementById("allOkMessage").style.display = "none";
        }, 250);
    }
    //If not have errors on load reviews or sales, show notification
    if (haveErrorOnGetSalesInfo == false && haveErrorOnGetReviewsInfo == false) {
        document.getElementById("allOkMessage").setAttribute("style", "opacity: 1; display: block;");
        document.getElementById("getDataErrorMessage").style.opacity = "0";
        setTimeout(function () {
            document.getElementById("getDataErrorMessage").style.display = "none";
        }, 250);
    }

    //Register listener to publisher id changes
    var prefsPublisherId = document.getElementById("prefsPublisherId");
    prefsPublisherId.value = localStorage.getItem("publisherId");
    var prefsReviewsRss = document.getElementById("prefsReviewsRss");
    prefsReviewsRss.value = localStorage.getItem("reviewsRss");
    var prefsPublisherButton = document.getElementById("prefsPublisherSave");
    prefsPublisherButton.addEventListener("click", function () {
        //Show errors
        prefsPublisherId.style.borderColor = (prefsPublisherId.value == "") ? "red" : "";
        prefsReviewsRss.style.borderColor = (prefsReviewsRss.value == "") ? "red" : "";

        //If is empty, return
        if (prefsPublisherId.value == "" || prefsReviewsRss.value == "")
            return;

        //Save data
        localStorage.setItem("publisherId", prefsPublisherId.value);
        localStorage.setItem("reviewsRss", prefsReviewsRss.value);
    });

    //Register listeners to preferences selects
    var prefsDelayBetweenUpdates = document.getElementById("prefsDelayBetweenUpdates");
    prefsDelayBetweenUpdates.value = localStorage.getItem("delayBetweenUpdates");
    prefsDelayBetweenUpdates.addEventListener("change", function () {
        localStorage.setItem("delayBetweenUpdates", prefsDelayBetweenUpdates.value);
    });
    var prefsNotifyOnStartService = document.getElementById("prefsNotifyOnStartService");
    prefsNotifyOnStartService.value = localStorage.getItem("showNotificationOnStart");
    prefsNotifyOnStartService.addEventListener("change", function () {
        localStorage.setItem("showNotificationOnStart", prefsNotifyOnStartService.value);
    });
}

//Function that report done loading sales data
function ReportDoneLoadingSalesData(errorOcurred) {
    //If already done, cancel report
    if (doneLoadingSalesData == true)
        return;

    //Save the information
    doneLoadingSalesData = true;
    haveErrorOnGetSalesInfo = errorOcurred;

    //Update the popup content
    RenderOrUpdatePopUpContent();
}
//Function that report done loading reviews data
function ReportDoneLoadingReviewsData(errorOcurred) {
    //If already done, cancel report
    if (doneLoadingReviewsData == true)
        return;

    //Save the information
    doneLoadingReviewsData = true;
    haveErrorOnGetReviewsInfo = errorOcurred;

    //Update the popup content
    RenderOrUpdatePopUpContent();
}