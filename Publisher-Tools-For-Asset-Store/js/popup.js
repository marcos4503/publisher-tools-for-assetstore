// @ts-nocheck

//Private variables
var doneLoadingSalesData = false;
var doneLoadingReviewsData = false;
var haveErrorOnGetSalesInfo = false;
var haveErrorOnGetReviewsInfo = false;
var lastReviewsRssXmlContentGetted;

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

            if (request.msg == "ReportServiceLastUpdateTime")
                ReportServiceLastUpdateTime(request.time);
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

    //Shows the button to open reviws window
    var openReviewsButton = document.getElementById("openReviewsWindowButton");
    var closeReviewsButton = document.getElementById("closeReviewsWindowButton");
    var reviewsWindow = document.getElementById("reviewsWindowNode");
    openReviewsButton.setAttribute("style", "opacity: 1; display: block;");
    openReviewsButton.addEventListener("click", function () {
        closeReviewsButton.setAttribute("style", "opacity: 0.5; pointer-events: all;");
        reviewsWindow.setAttribute("style", "right: 0px; pointer-events: all;");

        //Reset UI state
        document.getElementById("reviewsWindowLoadingNode").style.display = "block";
        document.getElementById("reviewsWindowContentBaseNode").style.display = "none";
        document.getElementById("reviewsWindowLoadErrorNode").style.display = "none";

        //Do a HTTP request to get all reviews from RSS
        var httpReviewsRequest = new XMLHttpRequest();
        httpReviewsRequest.onreadystatechange = function () {
            //On done loading
            if (this.readyState == 4) {
                //On success
                if (this.status == 200) {
                    //Process XML RSS returned Data
                    var xmlDoc = httpReviewsRequest.responseXML;
                    var rssRootNode = xmlDoc.getElementsByTagName("rss");
                    var reviewsNodes = rssRootNode[0].getElementsByTagName("item");
                    var assetsNames = ["All My Assets"];
                    //Loop to find all asset names
                    for (var i = 0; i < reviewsNodes.length; i++) {
                        //Get title of this review
                        var titleNodeText = reviewsNodes[i].getElementsByTagName("title")[0].innerHTML;
                        var descriptionNodeText = reviewsNodes[i].getElementsByTagName("description")[0].innerHTML;
                        //If this is a reply from publisher, ignore this and move to next
                        if (titleNodeText.includes("New reply") == true || descriptionNodeText.includes("Reply from publisher") == true)
                            continue;
                        //Add this asset to list of assets
                        if (assetsNames.includes(titleNodeText.split("\"")[1]) == false)
                            assetsNames.push(titleNodeText.split("\"")[1]);
                    }
                    //Add options finded to selector
                    var optionsCode = "";
                    for (var i = 0; i < assetsNames.length; i++)
                        optionsCode += '<option value="' + assetsNames[i] + '">' + assetsNames[i] + '</option>';
                    document.getElementById("assetToViewReviews").innerHTML = optionsCode;

                    //Save this RSS Reviews content getted
                    lastReviewsRssXmlContentGetted = xmlDoc;

                    //Add listener to selector
                    document.getElementById("assetToViewReviews").addEventListener("change", function () {
                        //Build a HTML code to show reviews for selected asset
                        var buildedHtmlCode = "";
                        var desiredAssetToShowReviews = document.getElementById("assetToViewReviews").value;

                        //Loop into all assets reviews to build HTML code
                        for (var i = 0; i < reviewsNodes.length; i++) {
                            //Get title of this review
                            var titleNodeText = reviewsNodes[i].getElementsByTagName("title")[0].innerHTML;
                            var descriptionNodeText = reviewsNodes[i].getElementsByTagName("description")[0].innerHTML;
                            var publicationNodeText = reviewsNodes[i].getElementsByTagName("pubDate")[0].innerHTML;
                            //If this is a reply from publisher, ignore this and move to next
                            if (titleNodeText.includes("New reply") == true || descriptionNodeText.includes("Reply from publisher") == true)
                                continue;
                            //Get all data about review of this asset
                            var assetName = titleNodeText.split("\"")[1];
                            var author = titleNodeText.split("\"  by ")[1];
                            var title = descriptionNodeText.split("&lt;/h1&gt;")[0].replace("&lt;h1&gt;", "");
                            var description = descriptionNodeText.split("&lt;p&gt;")[1].split("&lt;/p&gt;")[0];
                            var stars = (descriptionNodeText.match(/&amp;#9733;/g) || []).length;
                            var publicationDate = publicationNodeText.replace(" -0000", "").split(", ")[1];
                            var typeOfReview = (titleNodeText.includes("New review") == true) ? "New" : "Updated";
                            //If this is a review for desired asset, insert into builded code
                            if (desiredAssetToShowReviews == assetName || desiredAssetToShowReviews == "All My Assets")
                                buildedHtmlCode += '<div class="reviewBlock" style="background-color: ' + ((typeOfReview == "New") ? "#ecffeb" : "#fff5e8") + ';"><div class="reviewBlockAssetName"><b>(' + typeOfReview + ')</b> On ' + assetName + '</div><div class="reviewBlockTitle">' + title + '</div><div class="reviewBlockDescription">' + description + '</div><div class="reviewBlockInfo"><div class="reviewBlockStars"><img src="../img/star.png"/>' + stars + '</div><div class="reviewBlockTime"><img src="../img/time.png"/>' + publicationDate + '</div><div class="reviewBlockAuthor"><img src="../img/author.png"/>' + author + '</div></div></div>';
                        }

                        //Show HTML code
                        document.getElementById("reviewsWindowContentNode").innerHTML = buildedHtmlCode;
                    })
                    document.getElementById("assetToViewReviews").dispatchEvent(new Event("change"));

                    //Show content
                    document.getElementById("reviewsWindowLoadingNode").style.display = "none";
                    document.getElementById("reviewsWindowContentBaseNode").style.display = "block";
                }
                //On fail
                if (this.status != 200) {
                    //Show Error
                    document.getElementById("reviewsWindowLoadingNode").style.display = "none";
                    document.getElementById("reviewsWindowLoadErrorNode").style.display = "block";
                }
            }
        };
        httpReviewsRequest.open("GET", localStorage.getItem("reviewsRss"), true);
        httpReviewsRequest.withCredentials = true;
        httpReviewsRequest.send();
    });
    closeReviewsButton.addEventListener("click", function () {
        closeReviewsButton.setAttribute("style", "opacity: 0; pointer-events: none;");
        reviewsWindow.setAttribute("style", "right: -100%; pointer-events: none;");
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
//Function that report the last service update time
function ReportServiceLastUpdateTime(time) {
    document.getElementById("lastServiceUpdateTime").innerHTML = "Last Service Update ocurred at " + time + ".";
}