// Muaz Khan     - https://github.com/muaz-khan
// MIT License   - https://www.webrtc-experiment.com/licence/
// Documentation - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/RTCMultiConnection
var channel = "";
var sender = false;
var type = 1;
var q_array = window.location.href.replace(/.*\?(.*)$/g, '$1').split("&");
for (var i = 0; i < q_array.length; i++) {
    var q = q_array[i].split("=");
    if (q[0] == "name") {
        channel = Sha256.hash(q[1]);
        sender = true;
    } else if (q[0] == "hash") {
        channel = q[1];
    } else if (q[0] == "type") {
        type = q[1];
    }
}

var connection = new RTCMultiConnection(channel);
if (type == 0) {
    connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: true
    };
}

if (type == 0) {
    connection.session = {
        screen: true,
        oneway: true
    };
} else {
    connection.session = {
        audio: true,
        video: true,
        oneway: true
    };
}

var loaded = false;
connection.onstream = function(e) {
    loaded = true;
    var videosContainer = document.getElementById('videos-container') || document.body;
    videosContainer.innerHTML = "";
    videosContainer.insertBefore(e.mediaElement, videosContainer.firstChild);
};

function alertNoStream() {
    var vidyas = document.getElementById('videos-container');
    vidyas.innerHTML = "<div class='no-stream'>Stream over :( Try checking the thread for a new one.</div>";
    vidyas.style.opacity = 1;
}

connection.onstreamended = function(e) {
    e.mediaElement.style.opacity = 0;
    document.getElementById('videos-container').style.opacity = 0;
    setTimeout(function() {
        if (e.mediaElement.parentNode) {
            e.mediaElement.parentNode.removeChild(e.mediaElement);
            alertNoStream();
        }
    }, 1000);
};

function getRandomHash() {
    var current_date = (new Date()).valueOf().toString();
    var random = Math.random().toString();
    return Sha256.hash(current_date + random);
}

function startBroadcast() {
    if (type == 0) {
        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
        };
    }
    var connectionId = getRandomHash();
    connection.open(connectionId);
    window.history.pushState({
        "html": "",
        "pageTitle": ""
    }, "", window.location.origin + window.location.pathname + "?hash=" + channel);
};

if (sender) {
    startBroadcast();
} else {
    connection.connect();
    setTimeout(function() {
        if (!loaded) {
            alertNoStream();
        }
    }, 10000);
}