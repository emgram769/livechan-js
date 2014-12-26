// todo: need to check exact chrome browser because opera also uses chromium framework
var isChrome = !!navigator.webkitGetUserMedia;

// DetectRTC.js - https://github.com/muaz-khan/WebRTC-Experiment/tree/master/DetectRTC
// Below code is taken from RTCMultiConnection-v1.8.js (http://www.rtcmulticonnection.org/changes-log/#v1.8)
var DetectRTC = {};

(function() {

    var screenCallback;

    DetectRTC.screen = {
        chromeMediaSource: 'screen',
        getSourceId: function(callback) {
            if (!callback) throw '"callback" parameter is mandatory.';
            screenCallback = callback;
            window.postMessage('get-sourceId', '*');
        },
        isChromeExtensionAvailable: function(callback) {
            if (!callback) return;

            if (DetectRTC.screen.chromeMediaSource == 'desktop') return callback(true);

            // ask extension if it is available
            window.postMessage('are-you-there', '*');

            setTimeout(function() {
                if (DetectRTC.screen.chromeMediaSource == 'screen') {
                    callback(false);
                } else callback(true);
            }, 2000);
        },
        onMessageCallback: function(data) {
            if (!(typeof data == 'string' || !!data.sourceId)) return;

            console.log('chrome message', data);

            // "cancel" button is clicked
            if (data == 'PermissionDeniedError') {
                DetectRTC.screen.chromeMediaSource = 'PermissionDeniedError';
                if (screenCallback) return screenCallback('PermissionDeniedError');
                else throw new Error('PermissionDeniedError');
            }

            // extension notified his presence
            if (data == 'rtcmulticonnection-extension-loaded') {
                if (document.getElementById('install-button')) {
                    document.getElementById('install-button').parentNode.innerHTML = '<strong>Great!</strong> <a href="https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk" target="_blank">Google chrome extension</a> is installed.';
                }
                DetectRTC.screen.chromeMediaSource = 'desktop';
            }

            // extension shared temp sourceId
            if (data.sourceId) {
                DetectRTC.screen.sourceId = data.sourceId;
                if (screenCallback) screenCallback(DetectRTC.screen.sourceId);
            }
        },
        getChromeExtensionStatus: function(callback) {
            if (!!navigator.mozGetUserMedia) return callback('not-chrome');

            var extensionid = 'ajhifddimkapgcifgcodmmfdlknahffk';

            var image = document.createElement('img');
            image.src = 'chrome-extension://' + extensionid + '/icon.png';
            image.onload = function() {
                DetectRTC.screen.chromeMediaSource = 'screen';
                window.postMessage('are-you-there', '*');
                setTimeout(function() {
                    if (!DetectRTC.screen.notInstalled) {
                        callback('installed-enabled');
                    }
                }, 2000);
            };
            image.onerror = function() {
                DetectRTC.screen.notInstalled = true;
                callback('not-installed');
            };
        }
    };

    // check if desktop-capture extension installed.
    if (window.postMessage && isChrome) {
        DetectRTC.screen.isChromeExtensionAvailable();
    }
})();

DetectRTC.screen.getChromeExtensionStatus(function(status) {
    if (status == 'installed-enabled') {
        if (document.getElementById('install-button')) {
            document.getElementById('install-button').parentNode.innerHTML = '<strong>Great!</strong> <a href="https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk" target="_blank">Google chrome extension</a> is installed.';
        }
        DetectRTC.screen.chromeMediaSource = 'desktop';
    }
});

window.addEventListener('message', function(event) {
    if (event.origin != window.location.origin) {
        return;
    }

    DetectRTC.screen.onMessageCallback(event.data);
});
window.addEventListener('load', function(event) {
    roomName = queriesObject.name;
    if (roomName) {
        captureUserMedia(function() {
            conferenceUI.createRoom({
                roomName: roomName
            });
        });
        document.getElementById('share-link').href = window.location.origin + window.location.pathname + window.location.hash;
    }
});

console.log('current chromeMediaSource', DetectRTC.screen.chromeMediaSource);

