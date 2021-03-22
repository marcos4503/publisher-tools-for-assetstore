// @ts-nocheck

//Private variables
var id = 0;

//----- Starting functions ------
//Update all content of popup after window is loaded
window.onload = function () {
    UpdateAllContentOfPopUp();
}
//Create a message receiver for UpdateAllContentOfPopUp
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.msg == "UpdateAllContentOfPopUp")
            UpdateAllContentOfPopUp();
    }
);
//Call all important functions of background
chrome.runtime.sendMessage({ msg: "CallAllNeededImportantFunctions" });

//----- Core functions ------

//Update all content of popup
function UpdateAllContentOfPopUp() {
    //Register handler for login button
    document.getElementById("loginButton").addEventListener("click", function () { ValidateAndSaveDataOfLogin(); });
    //Show login popup if not have publisher data
    if (localStorage.getItem("publisherId") == null || localStorage.getItem("reviewsRss") == null) {
        document.getElementById("loginPopUpBgNode").setAttribute("style", "pointer-events: all; opacity: 0.5;");
        document.getElementById("loginPopUpBaseNode").setAttribute("style", "pointer-events: all; opacity: 1.0;");
    }

    console.log("updated");
}

//Validate and save the data typed in fields of login
function ValidateAndSaveDataOfLogin() {
    //Get fields
    var publisherId = document.getElementById("loginPublisherId");
    var reviewsRss = document.getElementById("loginReviewsRss");

    //Show errors
    publisherId.style.borderColor = (publisherId.value == "") ? "red" : "";
    reviewsRss.style.borderColor = (reviewsRss.value == "") ? "red" : "";

    //If is empty, return
    if (publisherId.value == "" || reviewsRss.value == "")
        return;

    //Save data
    localStorage.setItem("publisherId", publisherId.value);
    localStorage.setItem("reviewsRss", reviewsRss.value);

    //Hide login popup
    document.getElementById("loginPopUpBgNode").setAttribute("style", "pointer-events: none; opacity: 0;");
    document.getElementById("loginPopUpBaseNode").setAttribute("style", "pointer-events: none; opacity: 0;");
}