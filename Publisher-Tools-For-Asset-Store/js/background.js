// @ts-nocheck

//Private variables
var id = 0;

//Start in background, checking for new sales
setTimeout(function () { GetSalesAndNotifyIfHaveNew(); }, 1000);

//Create the alarm for check for new sales. Alarm will repeat every X minutes
chrome.alarms.create("GetSalesAndNotifyIfHaveNewAlarm", {
    delayInMinutes: 1,
    periodInMinutes: 1
});
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "GetSalesAndNotifyIfHaveNewAlarm") {
        GetSalesAndNotifyIfHaveNew();
    }
});


//Function to check for new sales and notify if necessary
function GetSalesAndNotifyIfHaveNew() {
    chrome.notifications.create(
        "name-for-notification" + id,
        {
            type: "basic",
            iconUrl: "../img/icon128.png",
            title: "This is a notification",
            message: "hello there! (" + localStorage.getItem("teste") + ")",
        },
        function () { }
    );

    console.log("Notified ID: " + id);
    id += 1;
}