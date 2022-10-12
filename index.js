"use strict";

import GUI from "lil-gui";
import * as eruda from "eruda";
import Stats from "stats.js";
import * as three from "three";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { createCamera } from "./camera.js";
import { SPOOKY_LANES } from "./core/halloween0.js";
import {
  createLaneNotes,
  createRailNotes,
  LANE_COLUMN,
  RAIL_COLUMN,
  GLOBAL_START_OFFSET,
} from "./core/notes.js";
import {
  createHighway,
  createJudge,
  createRailJudge,
  createRails,
  createLaneDim,
  createRailDim,
  HIGHWAY_POSITION_X,
  HIGHWAY_SCALE_X,
  RAIL_SCALE_X,
  RAIL_ROTATION,
  SIDES,
  LEFT_SIDE_M4,
  RIGHT_SIDE_M4,
  SIDE_LANE_OPACITY,
} from "./core/plane.js";
import {
  createLaneTouchArea,
  createRailTouchArea,
  LANE_TOUCH_AREA_COLUMN,
  RAIL_TOUCH_AREA_COLUMN,
} from "./core/touch.js";
import Deque from "double-ended-queue";
import halloweenUrl from "./halloween.mp3";

eruda.init();

// const interpolate = (value, r1, r2) => {
//     return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
// }


const makeGroup = ({ scene, renderLeftRail, renderRightRail, side }) => {
  const { laneNoteMesh, laneNoteInfo } = createLaneNotes(SPOOKY_LANES);

  const laneGroup = new three.Group();

  laneGroup.add(laneNoteMesh);

  const notes = [];
  const lanes = [RAIL_COLUMN.LEFT, RAIL_COLUMN.RIGHT];
  for (let i = 1.5, j = 0; i < 31.0; i += 0.8, j = (j + 1) % 2) {
    notes.push({ timing: i, column: lanes[j] });
  }
  const { railNoteMesh, railNoteInfo } = createRailNotes({
    notes,
    renderLeftRail,
    renderRightRail,
    side
  });
  laneGroup.add(railNoteMesh);

  const highway = createHighway();
  if (side !== SIDES.CENTER) {
    highway.material.transparent = true;
    highway.material.opacity = SIDE_LANE_OPACITY;
  }
  laneGroup.add(highway);
  const judge = createJudge();
  laneGroup.add(judge);
  const rails = createRails({ renderLeftRail, renderRightRail, side });
  laneGroup.add(rails);
  const railJudge = createRailJudge({ renderLeftRail, renderRightRail, side });
  laneGroup.add(railJudge);

  const dims = [
    createLaneDim(LANE_COLUMN.FAR_LEFT),
    createLaneDim(LANE_COLUMN.NEAR_LEFT),
    createLaneDim(LANE_COLUMN.NEAR_RIGHT),
    createLaneDim(LANE_COLUMN.FAR_RIGHT),
    createRailDim(RAIL_COLUMN.LEFT),
    createRailDim(RAIL_COLUMN.RIGHT),
  ];
  for (const laneDim of dims) {
    laneGroup.add(laneDim);
  }
  if (side === SIDES.LEFT_SIDE) {
    laneGroup.applyMatrix4(LEFT_SIDE_M4);
  } else if (side === SIDES.RIGHT_SIDE) {
    laneGroup.applyMatrix4(RIGHT_SIDE_M4);
  }
  // nix the visibility if it is not one of the three primary lanes
  if (!(side === SIDES.LEFT_SIDE || side === SIDES.RIGHT_SIDE || side === SIDES.CENTER)) {
    laneGroup.visible = false;
  }
  scene.add(laneGroup);
  return { laneNoteMesh, laneNoteInfo, railNoteMesh, railNoteInfo };
};

const main = () => {
  const gui = new GUI();
  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  const canvas = document.getElementById("joyride-canvas");
  const renderer = new three.WebGLRenderer({ canvas, alpha: true });
  const cssRenderer = new CSS2DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = "absolute";
  cssRenderer.domElement.style.top = "0px";
  document.body.appendChild(cssRenderer.domElement);
  const camera = createCamera(canvas.clientWidth / canvas.clientHeight);
  const raycaster = new three.Raycaster();

  const scene = new three.Scene();

  const ALL_GROUPS = [
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.CENTER,
      groupId: 0,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.LEFT_SIDE,
      groupId: 1,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.LEFT_ON_DECK,
      groupId: 2,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.OFF_SCREEN,
      groupId: 3,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.OFF_SCREEN,
      groupId: 4,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.OFF_SCREEN,
      groupId: 5,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.RIGHT_ON_DECK,
      groupId: 6,
    }),
    makeGroup({
      scene,
      renderLeftRail: true,
      renderRightRail: false,
      side: SIDES.RIGHT_SIDE,
      groupId: 7,
    })
  ];

  let mainGroup = ALL_GROUPS[0]
  let leftSideGroup = ALL_GROUPS[1];
  let rightSideGroup = ALL_GROUPS[7];


  const touchAreas = [
    createLaneTouchArea(LANE_TOUCH_AREA_COLUMN.FAR_LEFT),
    createLaneTouchArea(LANE_TOUCH_AREA_COLUMN.NEAR_LEFT),
    createLaneTouchArea(LANE_TOUCH_AREA_COLUMN.NEAR_RIGHT),
    createLaneTouchArea(LANE_TOUCH_AREA_COLUMN.FAR_RIGHT),
    createRailTouchArea(RAIL_TOUCH_AREA_COLUMN.LEFT),
    createRailTouchArea(RAIL_TOUCH_AREA_COLUMN.RIGHT),
  ];

  for (const touchArea of touchAreas) {
    scene.add(touchArea);
  }

  const scoreSpan = document.createElement("span");
  scoreSpan.id = "score-text";
  scoreSpan.textContent = "...";
  const scoreLabel = new CSS2DObject(scoreSpan);
  scene.add(scoreLabel);

  const comboSpan = document.createElement("span");
  comboSpan.id = "combo-text";
  comboSpan.textContent = "0";
  const comboLabel = new CSS2DObject(comboSpan);
  scene.add(comboLabel);

  let audioContext = null;
  let beginTime = null;
  let isPlaying = false;
  let comboCount = 0;

  const context = {
    movementThreshold: 1.0,
    toggleDims: function () {
      for (const dim of dims) {
        dim.visible = !dim.visible;
      }
    },
    toggleFullScreen: function () {
      if (document.fullscreenElement !== null) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    togglePlayBack: function () {
      if (audioContext) {
        audioContext.close();
      }
      audioContext = new AudioContext();
      /////
      function getData() {
        const source = audioContext.createBufferSource();
        const request = new XMLHttpRequest();

        request.open("GET", halloweenUrl, true);

        request.responseType = "arraybuffer";

        request.onload = () => {
          const audioData = request.response;

          audioContext.decodeAudioData(
            audioData,
            (buffer) => {
              source.buffer = buffer;
              source.connect(audioContext.destination);
              source.start(GLOBAL_START_OFFSET + audioContext.currentTime);
              beginTime = audioContext.currentTime;
              isPlaying = true;
            },

            (e) => console.error(`Error with decoding audio data: ${e.err}`)
          );
        };

        request.send();
      }
      getData();
      /////
    },
  };

  gui.add(context, "toggleDims").name("Toggle Dims");
  gui.add(context, "toggleFullScreen").name("Toggle Full Screen");
  gui.add(context, "movementThreshold", 0.5, 1.5).name("Movement Threshold");
  gui.add(context, "togglePlayBack").name("Toggle Playback");

  const tryResizeRendererToDisplay = () => {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = (canvas.clientWidth * pixelRatio) | 0;
    const height = (canvas.clientHeight * pixelRatio) | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      cssRenderer.setSize(window.innerWidth, window.innerHeight);
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }
  };

  const pointerBuffer = new three.Vector2();

  const handleTouch = (event) => {
    if (!isPlaying) {
      return;
    }

    const elapsedTime = audioContext.currentTime - beginTime;

    for (const touch of event.changedTouches) {
      pointerBuffer.x = (touch.clientX / window.innerWidth) * 2 - 1;
      pointerBuffer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointerBuffer, camera);
      const intersects = raycaster.intersectObjects(touchAreas);
      if (intersects.length === 0) {
        continue;
      }
      for (const {
        object: { uuid },
      } of intersects) {
        const latestLaneNote = activeLaneNoteInfo.peekFront();
        if (latestLaneNote === undefined) {
          continue;
        }

        const touchIndex = touchAreas.findIndex(
          (element) => element.uuid === uuid
        );
        const touchColumn = ["-1.5", "-0.5", "0.5", "1.5", "-1", "1"][
          touchIndex
        ];

        if (
          elapsedTime > latestLaneNote.timing - 0.1 &&
          elapsedTime < latestLaneNote.timing + 0.1 &&
          latestLaneNote.column.toString() === touchColumn
        ) {
          const untilPerfect = Math.abs(elapsedTime - latestLaneNote.timing);
          if (untilPerfect < 0.016) {
            comboCount += 1;
            scoreSpan.textContent = "Perfect!";
            comboSpan.textContent = comboCount;
            latestLaneNote.hasHit = true;
          } else if (untilPerfect < 0.032) {
            comboCount += 1;
            scoreSpan.textContent = "Perfect";
            comboSpan.textContent = comboCount;
            latestLaneNote.hasHit = true;
          } else if (untilPerfect > 0.032) {
            comboCount += 1;
            scoreSpan.textContent = "Near";
            comboSpan.textContent = comboCount;
            latestLaneNote.hasHit = true;
          }
        }
        const latestRailNote = activeRailNoteInfo.peekFront();
        if (latestLaneNote === undefined) {
          continue;
        }
        if (
          elapsedTime > latestRailNote.timing - 0.1 &&
          elapsedTime < latestRailNote.timing + 0.1 &&
          latestRailNote.column.toString() === touchColumn
        ) {
          const untilPerfect = Math.abs(elapsedTime - latestRailNote.timing);
          if (untilPerfect < 0.016) {
            comboCount += 1;
            scoreSpan.textContent = "Perfect!";
            comboSpan.textContent = comboCount;
            latestRailNote.hasHit = true;
          } else if (untilPerfect < 0.032) {
            comboCount += 1;
            scoreSpan.textContent = "Perfect";
            comboSpan.textContent = comboCount;
            latestRailNote.hasHit = true;
          } else if (untilPerfect > 0.032) {
            comboCount += 1;
            scoreSpan.textContent = "Near";
            comboSpan.textContent = comboCount;
            latestRailNote.hasHit = true;
          }
        }
      }
    }
  };

  document.documentElement.addEventListener("touchstart", handleTouch);
  // document.documentElement.addEventListener("touchstart", onStart);
  // document.documentElement.addEventListener("touchmove", onMove);
  // document.documentElement.addEventListener("touchend", onEnd);

  const activeLaneNoteInfo = new Deque();
  const activeRailNoteInfo = new Deque();

  const renderLoop = () => {
    raycaster.setFromCamera(pointerBuffer, camera);

    if (isPlaying) {
      const elapsedTime = audioContext.currentTime - beginTime;
      mainGroup.laneNoteMesh.material.uniforms.uTime.value = elapsedTime;
      mainGroup.railNoteMesh.material.uniforms.uTime.value = elapsedTime;
      leftSideGroup.laneNoteMesh.material.uniforms.uTime.value = elapsedTime;
      leftSideGroup.railNoteMesh.material.uniforms.uTime.value = elapsedTime;
      rightSideGroup.laneNoteMesh.material.uniforms.uTime.value = elapsedTime;
      rightSideGroup.railNoteMesh.material.uniforms.uTime.value = elapsedTime;
      while (true) {
        const latestNote = mainGroup.laneNoteInfo.at(-1);
        if (latestNote === undefined) {
          break;
        }
        if (elapsedTime > latestNote.timing - context.movementThreshold) {
          activeLaneNoteInfo.push(mainGroup.laneNoteInfo.pop());
        } else {
          break;
        }
      }

      while (true) {
        const latestNote = mainGroup.railNoteInfo.at(-1);
        if (latestNote === undefined) {
          break;
        }
        if (elapsedTime > latestNote.timing - context.movementThreshold) {
          activeRailNoteInfo.push(mainGroup.railNoteInfo.pop());
        } else {
          break;
        }
      }

      while (true) {
        const latestNote = activeLaneNoteInfo.peekFront();
        if (latestNote === undefined) {
          break;
        }
        if (elapsedTime > latestNote.timing + 0.1) {
          if (!latestNote.hasHit) {
            comboCount = 0;
            scoreSpan.textContent = "Miss!";
            comboSpan.textContent = comboCount;
          }
          activeLaneNoteInfo.removeFront();
        } else {
          break;
        }
      }

      while (true) {
        const latestNote = activeRailNoteInfo.peekFront();
        if (latestNote === undefined) {
          break;
        }
        if (elapsedTime > latestNote.timing + 0.1) {
          if (!latestNote.hasHit) {
            comboCount = 0;
            scoreSpan.textContent = "Miss!";
            comboSpan.textContent = comboCount;
          }
          activeRailNoteInfo.removeFront();
        } else {
          break;
        }
      }
    }

    tryResizeRendererToDisplay();

    stats.begin();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
    stats.end();

    requestAnimationFrame(renderLoop);
  };

  requestAnimationFrame(renderLoop);
};

main();
