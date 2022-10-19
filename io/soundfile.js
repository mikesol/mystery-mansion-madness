const MP3_URL = "https://cdn.filestackcontent.com/wY3jOl5STyGb1ybCYZZC";

export const getAudioData = () =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("GET", MP3_URL, true);

    request.responseType = "arraybuffer";

    request.onload = () => {
      const audioData = request.response;
      resolve(audioData);
    };
    request.onerror = () => { reject("Could not download audio data"); }

    request.send();
  });
