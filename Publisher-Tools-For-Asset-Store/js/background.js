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

    //-------------- Start Do a HTTP Request to process Sales -------------
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

                //Allocate variables to store name information for each asset returned by API
                var currentSalesPerAssetNames = new Array();
                //Allocate variables to store sales, refunds and chargebacks information for each asset returned by API
                var currentSalesPerAssetSales = new Array();
                var currentSalesPerAssetRefunds = new Array();
                var currentSalesPerAssetChargebacks = new Array();
                //Allocate variables of sales, refunds and chargebacks information to store total values of this current check
                var totalSalesOfCurrentCheck = 0;
                var totalRefundsOfCurrentCheck = 0;
                var totalChargebacksOfCurrentCheck = 0;
                //Allocate variables of sales, refunds and chargebacks information of last check done
                var totalSalesOfLastCheck = 0;
                var totalRefundsOfLastCheck = 0;
                var totalChargebacksOfLastCheck = 0;

                //Process JSON returned Data
                var responseJson = JSON.parse(httpSalesRequest.responseText);
                var allProducts = responseJson.aaData;
                var allResults = responseJson.result;
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

                    //Save all data of this asset, returned by this Request in current sales info variables
                    var idOfThisAssetInList = -1;
                    for (var x = 0; x < currentSalesPerAssetNames.length; x++)
                        if (currentSalesPerAssetNames[x] == productName)
                            idOfThisAssetInList = x;
                    //If is not first time of this asset, in list
                    if (idOfThisAssetInList != -1) {
                        currentSalesPerAssetSales[idOfThisAssetInList] += parseInt(productSales, 10);
                        currentSalesPerAssetRefunds[idOfThisAssetInList] += parseInt(productRefunds, 10);
                        currentSalesPerAssetChargebacks[idOfThisAssetInList] += parseInt(productChargebacks, 10);
                    }
                    //If is the first time of this asset, in list
                    if (idOfThisAssetInList == -1) {
                        currentSalesPerAssetNames.push(productName);
                        currentSalesPerAssetSales.push(parseInt(productSales, 10));
                        currentSalesPerAssetRefunds.push(parseInt(productRefunds, 10));
                        currentSalesPerAssetChargebacks.push(parseInt(productChargebacks, 10));
                    }
                }

                //Process all data collected of JSON returned by API. Extract all different data of lastCheck to currentCheck for each asset
                for (var i = 0; i < currentSalesPerAssetNames.length; i++) {
                    //Get sales, refunds and chargebacks data currently stored in local storage
                    var thisAssetName = currentSalesPerAssetNames[i];
                    var currentDataAboutThisAssetOnLocalStorage = localStorage.getItem("[Sales] " + thisAssetName);

                    //Save sales, refunds and chargebacks data of last check of this asset, in the pre-alocated variables of last check
                    if (currentDataAboutThisAssetOnLocalStorage != null) {
                        var thisAssetJsonData = JSON.parse(currentDataAboutThisAssetOnLocalStorage);
                        if (thisAssetJsonData.lastCheckMonth == mm.toString()) {
                            totalSalesOfLastCheck += parseInt(thisAssetJsonData.lastSalesCount, 10);
                            totalRefundsOfLastCheck += parseInt(thisAssetJsonData.lastRefundsCount, 10);
                            totalChargebacksOfLastCheck += parseInt(thisAssetJsonData.lastChargebacksCount, 10);
                        }
                    }

                    //Sum this data in the total sales, refunds and chargebacks data of all assets, in the pre-alocated variables of current check
                    totalSalesOfCurrentCheck += currentSalesPerAssetSales[i];
                    totalRefundsOfCurrentCheck += currentSalesPerAssetRefunds[i];
                    totalChargebacksOfCurrentCheck += currentSalesPerAssetChargebacks[i];

                    //Finally, save in local storage, the new values of sales, refund and chargebacks getted in current check
                    localStorage.setItem("[Sales] " + thisAssetName, '{"lastSalesCount":"' + currentSalesPerAssetSales[i] + '", "lastRefundsCount":"' + currentSalesPerAssetRefunds[i] + '", "lastChargebacksCount":"' + currentSalesPerAssetChargebacks[i] + '", "lastCheckMonth":"' + mm + '"}');
                }

                //If totalSalesOfCurrentCheck is greater than totalSalesOfLastCheck, notify publisher about new sales
                if (totalSalesOfCurrentCheck > totalSalesOfLastCheck)
                    chrome.notifications.create("",
                        {
                            type: "basic",
                            iconUrl: "../img/notify-new-sale.png",
                            title: "New Sales Made!",
                            message: (totalSalesOfCurrentCheck - totalSalesOfLastCheck).toString() + " new Sales have been made, since the last check done in this Month."
                        },
                        function () { });
                //If totalRefundsOfCurrentCheck is greater than totalRefundsOfLastCheck, notify publisher about new refunds
                if (totalRefundsOfCurrentCheck > totalRefundsOfLastCheck)
                    chrome.notifications.create("",
                        {
                            type: "basic",
                            iconUrl: "../img/notify-new-refund.png",
                            title: "New Refunds Made!",
                            message: (totalRefundsOfCurrentCheck - totalRefundsOfLastCheck).toString() + " new Refunds have been made, since the last check done in this Month."
                        },
                        function () { });
                //If totalChargebacksOfCurrentCheck is greater than totalChargebacksOfLastCheck, notify publisher about new chargebacks
                if (totalChargebacksOfCurrentCheck > totalChargebacksOfLastCheck)
                    chrome.notifications.create("",
                        {
                            type: "basic",
                            iconUrl: "../img/notify-new-chargeback.png",
                            title: "New Chargebacks Made!",
                            message: (totalChargebacksOfCurrentCheck - totalChargebacksOfLastCheck).toString() + " new Chargebacks have been made, since the last check done in this Month."
                        },
                        function () { });
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
    //-------------- End Do a HTTP Request to process Sales -------------

    //-------------- Start Do a HTTP Request to process Reviews -------------
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

                //Allocate variables of sales information
                var foundNewReviewPosted = false;
                var notificationContentForNewReviewPosted = "";
                var foundNewReviewUpdated = false;
                var notificationContentForNewReviewUpdated = "";

                //Process XML RSS returned Data
                var xmlDoc = httpReviewsRequest.responseXML;
                var rssRootNode = xmlDoc.getElementsByTagName("rss");
                var reviewsNodes = rssRootNode[0].getElementsByTagName("item");
                //Loop to find last New Review
                for (var i = 0; i < reviewsNodes.length; i++) {
                    //Get title of this review
                    var titleNodeText = reviewsNodes[i].getElementsByTagName("title")[0].innerHTML;
                    var descriptionNodeText = reviewsNodes[i].getElementsByTagName("description")[0].innerHTML;
                    //If this is a reply from publisher, ignore this and move to next
                    if (titleNodeText.includes("New reply") == true || descriptionNodeText.includes("Reply from publisher") == true)
                        continue;
                    //If this is a new review from custumer
                    if (titleNodeText.includes("New review") == true) {
                        //If have review data of last new review, compare and notify
                        var lastCheckLastNewReviewTitle = "";
                        if (localStorage.getItem("lastNewReviewPosted") != null)
                            lastCheckLastNewReviewTitle = JSON.parse(localStorage.getItem("lastNewReviewPosted")).description;
                        var currentCheckLastNewReviewTitle = encodeURI(descriptionNodeText);

                        //Save last new review posted data
                        localStorage.setItem("lastNewReviewPosted", '{"assetName":"' + titleNodeText.split("\"")[1] + '", "author":"' + titleNodeText.split("\"  by ")[1] + '", "description":"' + encodeURI(descriptionNodeText) + '", "stars":"' + ((descriptionNodeText.match(/&amp;#9733;/g) || []).length).toString() + '"}');

                        //Inform the new review, if currentCheckLastNewReviewTitle is differente from lastCheckLastNewReviewTitle
                        if (currentCheckLastNewReviewTitle != lastCheckLastNewReviewTitle) {
                            foundNewReviewPosted = true;
                            notificationContentForNewReviewPosted = "A new Review was Posted for asset \"" + JSON.parse(localStorage.getItem("lastNewReviewPosted")).assetName + "\" since the last check.";
                        }
                        break;
                    }
                }
                //Loop to find last Updated Review
                for (var i = 0; i < reviewsNodes.length; i++) {
                    //Get title of this review
                    var titleNodeText = reviewsNodes[i].getElementsByTagName("title")[0].innerHTML;
                    var descriptionNodeText = reviewsNodes[i].getElementsByTagName("description")[0].innerHTML;
                    //If this is a reply from publisher, ignore this and move to next
                    if (titleNodeText.includes("New reply") == true || descriptionNodeText.includes("Reply from publisher") == true)
                        continue;
                    //If this is a updated review from custumer
                    if (titleNodeText.includes("Updated review") == true) {
                        //If have review data of last updated review, compare and notify
                        var lastCheckLastUpdatedReviewTitle = "";
                        if (localStorage.getItem("lastNewReviewUpdated") != null)
                            lastCheckLastUpdatedReviewTitle = JSON.parse(localStorage.getItem("lastNewReviewUpdated")).description;
                        var currentCheckLastUpdatedReviewTitle = encodeURI(descriptionNodeText);

                        //Save last new review posted data
                        localStorage.setItem("lastNewReviewUpdated", '{"assetName":"' + titleNodeText.split("\"")[1] + '", "author":"' + titleNodeText.split("\"  by ")[1] + '", "description":"' + encodeURI(descriptionNodeText) + '", "stars":"' + ((descriptionNodeText.match(/&amp;#9733;/g) || []).length).toString() + '"}');

                        //Inform the new review, if currentCheckLastUpdatedReviewTitle is differente from lastCheckLastUpdatedReviewTitle
                        if (currentCheckLastUpdatedReviewTitle != lastCheckLastUpdatedReviewTitle) {
                            foundNewReviewUpdated = true;
                            notificationContentForNewReviewUpdated = "A Review was Updated in asset \"" + JSON.parse(localStorage.getItem("lastNewReviewUpdated")).assetName + "\" since the last check.";
                        }
                        break;
                    }
                }

                //If found new review posted
                if (foundNewReviewPosted == true)
                    chrome.notifications.create("",
                        {
                            type: "basic",
                            iconUrl: "../img/notify-new-review.png",
                            title: "New Review Posted!",
                            message: notificationContentForNewReviewPosted
                        },
                        function () { });

                //If found new review updated
                if (foundNewReviewUpdated == true)
                    chrome.notifications.create("",
                        {
                            type: "basic",
                            iconUrl: "../img/notify-updated-review.png",
                            title: "New Review Updated!",
                            message: notificationContentForNewReviewUpdated
                        },
                        function () { });
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
    //-------------- End Do a HTTP Request to process Reviews -------------

    //Save time of last update of service
    chrome.runtime.sendMessage({ msg: "ReportServiceLastUpdateTime", time: time });

    //Notify this update on console
    console.log("New Update Of Service Was Runned In " + dd + "/" + mm + " " + time + ". (Sales Request: " + ((problemsOcurredOnDoSalesRequest == false) ? "Ok" : "Error") + " | Reviews Request: " + ((problemsOcurredOnDoReviewsRequest == false) ? "Ok" : "Error") + ")");
}

//Function that show or hide the badge, if ocurred problems on some http request
function ShowOrHideBadgeIfOcurredErrorOnSomeRequest() {
    //Show or hide the badge, if ocurred problems on some Http request
    if (problemsOcurredOnDoSalesRequest == true || problemsOcurredOnDoReviewsRequest == true)
        chrome.browserAction.setBadgeText({ text: 'Error' });
    if (problemsOcurredOnDoSalesRequest == false && problemsOcurredOnDoReviewsRequest == false)
        chrome.browserAction.setBadgeText({ text: '' });
}