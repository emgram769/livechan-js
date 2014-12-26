var screenFrame, loadedScreenFrame;

function loadScreenFrame(skip) {
    if(loadedScreenFrame) return;
    if(!skip) return loadScreenFrame(true);

    loadedScreenFrame = true;

    var iframe = document.createElement('iframe');
    iframe.onload = function () {
        iframe.isLoaded = true;
        console.log('Screen Capturing frame is loaded.');

    };
    iframe.src = 'https://www.webrtc-experiment.com/getSourceId/';
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);

    screenFrame = {
postMessage: function () {
                 if (!iframe.isLoaded) {
                     setTimeout(screenFrame.postMessage, 100);
                     return;
                 }
                 console.log('Asking iframe for sourceId.');
                 iframe.contentWindow.postMessage({
captureSourceId: true
}, '*');
}
};
};

if(!isWebRTCExperimentsDomain) {
    loadScreenFrame();
}
else {
    document.getElementById('share-screen').disabled = false;
    document.getElementById('room-name').disabled = false;
}

