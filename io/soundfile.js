import halloweenUrl from "../assets/halloween2.mp3";

export const getAudioData = () =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("GET", halloweenUrl, true);

    request.responseType = "arraybuffer";

    request.onload = () => {
      const audioData = request.response;
      resolve(audioData);
    };
    request.onerror = () => { reject("Could not download audio data"); }

    request.send();
  });
