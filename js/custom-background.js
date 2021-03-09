const displayMediaOptions = {
  video: true,
  audio: true,
};

var recording = false;
var tabid = 0;
var maintabs = [];
var quality = "max";
var camerasize = "small-size";
var camerapos = {x:"10px", y:"10px"};

const chunks = [];
let mediaRecorder = null;

chrome.runtime.onInstalled.addListener(function() {
  // Set defaults when the extension is installed
  chrome.storage.sync.set({
      toolbar: true,
      countdown: true,
      countdown_time: 3,
      flip: true,
      pushtotalk: false,
      camera: 0,
      mic: 0,
      type: "tab-only",
      quality: "max"
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'testAction') {
    console.log('test success!')
    return sendResponse(`The date you sent was: ${request.payload}`)
  }
  else if (request.action === 'startRecording') {
    injectContent(true)
    startRecording(request, sender, sendResponse)
  }
  else if (request.action === 'stopRecording') {
    stopCapture();

    setTimeout(() => {
      const url = URL.createObjectURL(new Blob(chunks));
      console.log('final video URL', url);
      sendResponse({ url });
      chunks.length = 0;
    }, 5000)
  }
  else if (request.type == "pause") {
    pauseRecording();
    sendResponse({success: true});
  } 
  else if (request.type == "update-camera") {
    updateCamera(request);
  }

  return true;
});

const startRecording = async (request, sender, sendResponse) => {
  const { isTabCapture = true } = request.payload || {}

  if(isTabCapture){
    const stream = await startTabCapture();
    if(stream) recordStream(stream);
  } 
  else {
    const stream = await startCapture();
    if(stream) recordStream(stream);
  }
}

const startCapture = async () => {
  console.log('Start Capture')
  let capturedStream = null;

  try {
    capturedStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  } catch(err) {
    console.error("Error: " + err);
  }

  return capturedStream
}

const startTabCapture = () => {
  console.log('Start Tab Capture');

  return new Promise((resolve, reject) => {
    chrome.tabCapture.capture(displayMediaOptions, stream => {
      if(stream) return resolve(stream);
      else return reject('Error: no stream provided by tabCapture')
    });
  });
}

const stopCapture = () => {
  console.log('Stop Capturing')

  mediaRecorder.stop();
}

const recordStream = (stream) => {
  const options = { mimeType: 'video/webm;codecs=vp8,opus' };
  mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      console.log('saving chunk', event.data)
      chunks.push(event.data);
    }
  };
  mediaRecorder.start(1000);
}

function updateCamera(request) {
  chrome.tabs.getSelected(null, function(tab) {
      // Save user preference
      chrome.storage.sync.set({
          camera: request.id
      });

      // Send user preference to content script
      chrome.tabs.sendMessage(tab.id, {
          type: request.type,
          id: request.id
      });
  });
}

function pauseRecording() {
  mediaRecorder.pause();
}

// Inject content script
function injectContent(start) {
  chrome.storage.sync.get(['countdown'], function(result) {
      chrome.tabs.getSelected(null, function(tab) {
          if (maintabs.indexOf(tab.id) == -1) {
              // Inject content if it's not a camera recording and the script hasn't been injected before in this tab
              tabid = tab.id;
              chrome.tabs.executeScript(tab.id, {
                  file: './js/libraries/jquery-3.5.1.min.js'
              });
              chrome.tabs.executeScript(tab.id, {
                  file: './js/libraries/fabric.min.js'
              });
              chrome.tabs.executeScript(tab.id, {
                  file: './js/libraries/pickr.min.js'
              });
              chrome.tabs.executeScript(tab.id, {
                  file: './js/libraries/arrow.js'
              });

              // Check if it's a new or ongoing recording
              if (start) {
                  chrome.tabs.executeScript(tab.id, {
                      code: 'window.countdownactive = ' + result.countdown + ';window.camerasize = "' + camerasize + '";window.camerapos = {x:"'+camerapos.x+'",y:"'+camerapos.y+'"};'
                  }, function() {
                      chrome.tabs.executeScript(tab.id, {
                          file: './js/content.js'
                      });
                  });
              } else {
                  chrome.tabs.executeScript(tab.id, {
                      code: 'window.countdownactive = false;window.camerasize = "' + camerasize + '";window.camerapos = {x:"'+camerapos.x+'",y:"'+camerapos.y+'"};'
                  }, function() {
                      chrome.tabs.executeScript(tab.id, {
                          file: './js/content.js'
                      });
                  });
              }

              chrome.tabs.insertCSS(tab.id, {
                  file: './css/content.css'
              })
              chrome.tabs.insertCSS(tab.id, {
                  file: './css/libraries/pickr.css'
              })
              maintabs.push(tab.id);
          } else {
              // If the current tab already has the script injected
              if (start) {
                  chrome.tabs.sendMessage(tab.id, {
                      type: "restart",
                      countdown: result.countdown
                  });
              } else {
                  chrome.tabs.sendMessage(tab.id, {
                      type: "restart",
                      countdown: false,
                      camerapos: camerapos,
                      camerasize: camerasize
                  });
              }
          }
      })
  })
}
