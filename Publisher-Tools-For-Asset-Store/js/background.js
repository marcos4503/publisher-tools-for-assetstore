// @ts-nocheck

//Private variables
var id = 0;

//----- Starting functions ------

//Start in background, calling all needed important functions
setTimeout(function () { CallAllNeededImportantFunctions(); }, 1000);
//Create the alarm for call all needed important functions. Alarm will repeat every X minutes
chrome.alarms.create("CallAllNeededImportantFunctions", {
    delayInMinutes: 1,
    periodInMinutes: 1
});
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "CallAllNeededImportantFunctions") {
        CallAllNeededImportantFunctions();
    }
});
//Create a message receiver for CallAllNeededImportantFunctions inside of popup
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.msg == "CallAllNeededImportantFunctions")
            CallAllNeededImportantFunctions();
    }
);

//----- Core functions ------

//Main function that calls all others needed
function CallAllNeededImportantFunctions() {
    //Show badge of error if not provided review rss or publisher id
    if (localStorage.getItem("publisherId") == null || localStorage.getItem("reviewsRss") == null)
        SetVisibilityOfBadgeInExtensionIcon(true);

    //Check for new sales (if provided publisher ID)
    if (localStorage.getItem("publisherId") != null)
        GetSalesAndNotifyIfHaveNew();

    //Send message to popup update all content
    chrome.runtime.sendMessage({ msg: "UpdateAllContentOfPopUp" });
}
//Function that shows or hide the badge in extension icon
function SetVisibilityOfBadgeInExtensionIcon(show) {
    //If is desired to show
    if (show == true) {
        chrome.browserAction.setBadgeBackgroundColor({ color: [190, 0, 0, 255] });
        chrome.browserAction.setBadgeText({ text: 'Login' });
    }
    //If is not desired to show
    if (show == false) {
        chrome.browserAction.setBadgeBackgroundColor({ color: [190, 0, 0, 255] });
        chrome.browserAction.setBadgeText({ text: '' });
    }
}

//----- Important functions ------

//Function to check for new sales and notify if necessary
function GetSalesAndNotifyIfHaveNew() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
        //On done loading
        if (this.readyState == 4) {
            //On success
            if (this.status == 200) {
                //Post processes response returned
                ProcessResponseFromUnitySalesAPI(httpRequest.responseText);

                //Remove the warning from icon
                SetVisibilityOfBadgeInExtensionIcon(false);
            }
            //On fail
            if (this.status != 200) {
                //Add the warning from icon
                SetVisibilityOfBadgeInExtensionIcon(true);
            }
        }
    };
    httpRequest.open("GET", "https://publisher.assetstore.unity3d.com/api/publisher-info/sales/40306/202103.json", true);
    httpRequest.withCredentials = true;
    httpRequest.send();
}
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
}