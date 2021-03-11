const defaultConstraints = {
  audio: true,
  video: {
    width: { min: 320, ideal: 1024, max: 2048 },
    height: { min: 240, ideal: 768, max: 1536 },
    facingMode: 'user',
  },
};

const getUserMediaStream = async (constraints) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    return stream;
  } catch (err) {
    console.log('The following getUserMedia error occured:.. ', err);
    console.log({ code: err.code, name: err.name, message: err });
    throw err;
  }
}

const initiateMediaViewer = async (data) => {
  try {
    console.log('Initiating Media Viewer')
    const video = document.querySelector('#sc-video');
    const stream = await getUserMediaStream(defaultConstraints);
    console.log({ stream, video })
    video.muted = true;
    video.srcObject = stream;
  } catch (err) {
    console.error(err);
  }
}

const injectUI = async () => {
  const screenRecorder = await fetch(chrome.runtime.getURL('/html/screen-recorder.html'));
  const screenRecorderHTML = await screenRecorder.text();
  
  document.head.insertAdjacentHTML('beforeend', '<link href="' + chrome.runtime.getURL('/css/screen-recorder.css') + '" rel="stylesheet">')
  document.body.insertAdjacentHTML('beforeend', screenRecorderHTML);
}

const initialiseExtension = async () => {
  console.log('awaiting UI Injection')
  await injectUI();
  console.log('awaiting MediaViewer init')
  await initiateMediaViewer();
}

initialiseExtension();
