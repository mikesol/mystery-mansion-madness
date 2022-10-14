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
  TABLE_DENSITY_PER_SECOND,
} from "./core/notes.js";
import {
  createHighway,
  createJudge,
  createRailJudge,
  createRails,
  createLaneDim,
  createRailDim,
  SIDES,
  LEFT_SIDE_M4,
  RIGHT_SIDE_M4,
  SIDE_LANE_OPACITY,
  LEFT_ON_DECK_M4,
  RIGHT_ON_DECK_M4,
  LEFT_ON_DECK_QUATERNION,
  LEFT_SIDE_QUATERNION,
  LEFT_ON_DECK_POSITION,
  LEFT_SIDE_POSITION,
  MIDDLE_QUATERNION,
  MIDDLE_POSITION,
  RIGHT_SIDE_QUATERNION,
  RIGHT_SIDE_POSITION,
  RIGHT_ON_DECK_QUATERNION,
  RIGHT_ON_DECK_POSITION,
  RAIL_SIDE_QUTERNION,
  RAIL_CENTER_QUTERNION,
  RAIL_SIDE_POSITION,
  RAIL_CENTER_POSITION,
  RAIL_ROTATION,
  OFF_SCREEN_M4,
} from "./core/plane.js";
import {
  createLaneTouchArea,
  createRailTouchArea,
  LANE_TOUCH_AREA_COLUMN,
  RAIL_TOUCH_AREA_COLUMN,
} from "./core/touch.js";
import halloweenUrl from "./halloween.mp3";

eruda.init();

const negMod = (x, n) => ((x % n) + n) % n;
const lerpyMcLerpLerp = (a,b,t) => a * (1-t) + b * t;

const SHIFT_INSTRUCTION = {
  GO_LEFT: 0,
  GO_RIGHT: 1,
};

const ROTATION_DURATION = 0.6;

const makeGroup = ({ scene, side, groupId }) => {
  // thin stuff out
  const laneNotes = SPOOKY_LANES.filter(
    (_, i) => i % 8 !== groupId && (i + 3) % 8 !== groupId
  );
  const { laneNoteMesh, laneNoteInfo, laneNoteTable } = createLaneNotes({
    notes: laneNotes,
    groupId,
  });

  const sideGroup = new three.Group();
  const railGroup = new three.Group();

  sideGroup.add(laneNoteMesh);

  const railNotes = [];
  for (let i = 1.5 + 0.1 * groupId; i < 120.0; i += 1.6) {
    railNotes.push({ timing: i, column: RAIL_COLUMN.LEFT });
  }
  const { railNoteMesh, railNoteInfo, railNoteTable } = createRailNotes({
    notes: railNotes,
    side,
    groupId,
  });
  railGroup.add(railNoteMesh);

  const highway = createHighway();
  highway.material.transparent = true;
  if (side !== SIDES.CENTER) {
    highway.material.opacity = SIDE_LANE_OPACITY;
  }
  sideGroup.add(highway);
  const judge = createJudge();
  sideGroup.add(judge);
  const rails = createRails({ side });
  railGroup.add(rails);
  const railJudge = createRailJudge({ side });
  railGroup.add(railJudge);

  const dims = [
    createLaneDim(LANE_COLUMN.FAR_LEFT),
    createLaneDim(LANE_COLUMN.NEAR_LEFT),
    createLaneDim(LANE_COLUMN.NEAR_RIGHT),
    createLaneDim(LANE_COLUMN.FAR_RIGHT),
    createRailDim(RAIL_COLUMN.LEFT),
    createRailDim(RAIL_COLUMN.RIGHT),
  ];
  for (const laneDim of dims) {
    sideGroup.add(laneDim);
  }
  if (side === SIDES.LEFT_SIDE) {
    sideGroup.applyMatrix4(LEFT_SIDE_M4);
  } else if (side === SIDES.RIGHT_SIDE) {
    sideGroup.applyMatrix4(RIGHT_SIDE_M4);
  }
  // nix the visibility if it is not one of the three primary lanes
  if (
    !(
      side === SIDES.LEFT_SIDE ||
      side === SIDES.RIGHT_SIDE ||
      side === SIDES.CENTER
    )
  ) {
    sideGroup.visible = false;
  }
  if (side === SIDES.CENTER) {
    railGroup.setRotationFromEuler(new three.Euler(0.0, 0.0, -RAIL_ROTATION));
  }
  railGroup.position.copy(
    side === SIDES.CENTER ? RAIL_CENTER_POSITION : RAIL_SIDE_POSITION
  );
  sideGroup.add(railGroup);
  scene.add(sideGroup);
  return {
    sideGroup,
    railGroup,
    highway,
    laneNoteMesh,
    laneNoteInfo,
    laneNoteTable,
    railNoteMesh,
    railNoteInfo,
    railNoteTable,
  };
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
      side: SIDES.CENTER,
      groupId: 0,
    }),
    makeGroup({
      scene,
      side: SIDES.LEFT_SIDE,
      groupId: 1,
    }),
    makeGroup({
      scene,
      side: SIDES.LEFT_ON_DECK,
      groupId: 2,
    }),
    makeGroup({
      scene,
      side: SIDES.OFF_SCREEN,
      groupId: 3,
    }),
    makeGroup({
      scene,
      side: SIDES.OFF_SCREEN,
      groupId: 4,
    }),
    makeGroup({
      scene,
      side: SIDES.OFF_SCREEN,
      groupId: 5,
    }),
    makeGroup({
      scene,
      side: SIDES.RIGHT_ON_DECK,
      groupId: 6,
    }),
    makeGroup({
      scene,
      side: SIDES.RIGHT_SIDE,
      groupId: 7,
    }),
  ];

  const currentRotationAnimationTargets = [];

  let currentGroupIndex = 0;
  let inRotationAnimation = false;
  let rotationAnimationDirection = undefined;
  let rotationAnimationStartsAt = undefined;
  let mainGroup = ALL_GROUPS[0];
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
              source.start(audioContext.currentTime);
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

  const doShift = (dir) => {
    const previousGroupIndex = currentGroupIndex;
    currentGroupIndex = negMod(
      dir === SHIFT_INSTRUCTION.GO_LEFT
        ? currentGroupIndex + 1
        : currentGroupIndex - 1,
      8
    );
    if (dir === SHIFT_INSTRUCTION.GO_LEFT) {
      // do the non-animating shifts
      //// right on deck goes to not visible
      ALL_GROUPS[negMod(previousGroupIndex - 2, 8)].sideGroup.applyMatrix4(OFF_SCREEN_M4);
      //// left-most not visible goes to left on-deck
      ALL_GROUPS[negMod(previousGroupIndex + 3, 8)].sideGroup.applyMatrix4(
        LEFT_ON_DECK_M4
      );
      //// set the visibility of left-on-deck to true
      ALL_GROUPS[negMod(previousGroupIndex + 2, 8)].sideGroup.visible = true;
      //// set the animation targets
      ////// set left on deck to left
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex + 2, 8)].sideGroup,
        qstart: LEFT_ON_DECK_QUATERNION,
        qend: LEFT_SIDE_QUATERNION,
        pstart: LEFT_ON_DECK_POSITION,
        pend: LEFT_SIDE_POSITION,
      });
      ////// set left to main
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex + 1, 8)].sideGroup,
        qstart: LEFT_SIDE_QUATERNION,
        qend: MIDDLE_QUATERNION,
        pstart: LEFT_SIDE_POSITION,
        pend: MIDDLE_POSITION,
      });
      ////// set left rail to tilted
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex + 1, 8)].railGroup,
        qstart: RAIL_SIDE_QUTERNION,
        qend: RAIL_CENTER_QUTERNION,
        pstart: RAIL_SIDE_POSITION,
        pend: RAIL_CENTER_POSITION,
      });
      ////// set main rail to untilted
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex, 8)].railGroup,
        qstart: RAIL_CENTER_QUTERNION,
        qend: RAIL_SIDE_QUTERNION,
        pstart: RAIL_CENTER_POSITION,
        pend: RAIL_SIDE_POSITION,
      });
      ////// set main to right
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex, 8)].sideGroup,
        qstart: MIDDLE_QUATERNION,
        qend: RIGHT_SIDE_QUATERNION,
        pstart: MIDDLE_POSITION,
        pend: RIGHT_SIDE_POSITION,
      });
      ////// set right to right on deck
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex - 1, 8)].sideGroup,
        qstart: RIGHT_SIDE_QUATERNION,
        qend: RIGHT_ON_DECK_QUATERNION,
        pstart: RIGHT_SIDE_POSITION,
        pend: RIGHT_ON_DECK_POSITION,
      });
    } else {
      // do the non-animating shifts
      //// left on deck goes to not visible
      ALL_GROUPS[negMod(previousGroupIndex + 2, 8)].sideGroup.applyMatrix4(OFF_SCREEN_M4);
      //// right-most not visible goes to right on-deck
      ALL_GROUPS[negMod(previousGroupIndex - 3, 8)].sideGroup.applyMatrix4(
        RIGHT_ON_DECK_M4
      );
      //// set the visibility of right-on-deck to true
      ALL_GROUPS[negMod(previousGroupIndex - 2, 8)].sideGroup.visible = true;
      //// set the animation targets
      ////// set right on deck to right
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex - 2, 8)].sideGroup,
        qstart: RIGHT_ON_DECK_QUATERNION,
        qend: RIGHT_SIDE_QUATERNION,
        pstart: RIGHT_ON_DECK_POSITION,
        pend: RIGHT_SIDE_POSITION,
      });
      ////// set right to main
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex - 1, 8)].sideGroup,
        qstart: RIGHT_SIDE_QUATERNION,
        qend: MIDDLE_QUATERNION,
        pstart: RIGHT_SIDE_POSITION,
        pend: MIDDLE_POSITION,
      });
      ////// set right rail to tilted
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex - 1, 8)].railGroup,
        qstart: RAIL_SIDE_QUTERNION,
        qend: RAIL_CENTER_QUTERNION,
        pstart: RAIL_SIDE_POSITION,
        pend: RAIL_CENTER_POSITION,
      });
      ////// set main rail to untilted
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex, 8)].railGroup,
        qstart: RAIL_CENTER_QUTERNION,
        qend: RAIL_SIDE_QUTERNION,
        pstart: RAIL_CENTER_POSITION,
        pend: RAIL_SIDE_POSITION,
      });
      ////// set main to left
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex, 8)].sideGroup,
        qstart: MIDDLE_QUATERNION,
        qend: LEFT_SIDE_QUATERNION,
        pstart: MIDDLE_POSITION,
        pend: LEFT_SIDE_POSITION,
      });
      ////// set left to left on deck
      currentRotationAnimationTargets.push({
        target: ALL_GROUPS[negMod(previousGroupIndex + 1, 8)].sideGroup,
        qstart: LEFT_SIDE_QUATERNION,
        qend: LEFT_ON_DECK_QUATERNION,
        pstart: LEFT_SIDE_POSITION,
        pend: LEFT_ON_DECK_POSITION,
      });
    }
    mainGroup = ALL_GROUPS[currentGroupIndex];
    leftSideGroup = ALL_GROUPS[negMod(currentGroupIndex + 1, 8)];
    rightSideGroup = ALL_GROUPS[negMod(currentGroupIndex - 1, 8)];
    inRotationAnimation = true;
    rotationAnimationDirection = dir;
  };

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
      const index = Math.floor(elapsedTime * TABLE_DENSITY_PER_SECOND);
      const activeLanes = mainGroup.laneNoteTable[index];
      // rails are always represented on the left
      // so we take the rightSideGroup to represent the left rail
      const activeRails = mainGroup.railNoteTable[index].concat(
        ...rightSideGroup.railNoteTable[index]
      );

      for (const {
        object: { uuid },
      } of intersects) {
        //// start loop

        const touchIndex = touchAreas.findIndex(
          (element) => element.uuid === uuid
        ); // 0,1,2,3 is the highway, 4 is the left, 5 is the right

        const latestLaneNote =
          touchIndex > 3 || activeLanes[touchIndex] === undefined
            ? undefined
            : mainGroup.laneNoteInfo[activeLanes[touchIndex]];
        if (
          latestLaneNote &&
          elapsedTime > latestLaneNote.timing - 0.1 &&
          elapsedTime < latestLaneNote.timing + 0.1
        ) {
          const untilPerfect = Math.abs(elapsedTime - latestLaneNote.timing);
          if (untilPerfect < 0.016) {
            comboCount += 1;
            scoreSpan.textContent = "Perfect!";
            comboSpan.textContent = comboCount;
            latestLaneNote.hasHit = true;
          } else if (untilPerfect < 0.032) {
            comboCount += 1;
            scoreSpan.textContent = "Nice";
            comboSpan.textContent = comboCount;
            latestLaneNote.hasHit = true;
          } else if (untilPerfect > 0.032) {
            comboCount += 1;
            scoreSpan.textContent = "Near";
            comboSpan.textContent = comboCount;
            latestLaneNote.hasHit = true;
          }
        }
        const latestRailNote =
          touchIndex === 4 && activeRails[0] !== undefined
            ? mainGroup.railNoteInfo[activeRails[0]]
            : touchIndex === 5 && activeRails[1] !== undefined
            ? rightSideGroup.railNoteInfo[activeRails[1]]
            : undefined;
        if (
          latestRailNote &&
          elapsedTime > latestRailNote.timing - 0.1 &&
          elapsedTime < latestRailNote.timing + 0.1
        ) {
          scoreSpan.textContent =
            touchIndex === 4 ? "Shift Left!" : "Shift Right!";
          comboSpan.textContent = "";
          latestRailNote.hasHit = true;
          doShift(
            touchIndex === 4
              ? SHIFT_INSTRUCTION.GO_LEFT
              : SHIFT_INSTRUCTION.GO_RIGHT
          );
        }
        /// end loop
      }
    }
  };

  document.documentElement.addEventListener("touchstart", handleTouch);

  const renderLoop = () => {
    raycaster.setFromCamera(pointerBuffer, camera);

    if (isPlaying) {
      const elapsedTime = audioContext.currentTime - beginTime;
      if (inRotationAnimation) {
        if (rotationAnimationStartsAt === undefined) {
          rotationAnimationStartsAt = elapsedTime;
        }
        if (elapsedTime > ROTATION_DURATION + rotationAnimationStartsAt) {
          // set the final
          for (const target of currentRotationAnimationTargets) {
            target.target.quaternion.copy(target.qend);
            target.target.position.copy(target.pend);
          }
          // remove visibility of anything that would have become invisible
          if (rotationAnimationDirection === SHIFT_INSTRUCTION.GO_LEFT) {
            // something to the far off right should be invisible
            ALL_GROUPS[negMod(currentGroupIndex - 2, 8)].visible = false;
            mainGroup.highway.material.opacity = 1.0
            rightSideGroup.highway.material.opacity = SIDE_LANE_OPACITY;
          } else {
            // something to the far off left should be invisible
            ALL_GROUPS[negMod(currentGroupIndex + 2, 8)].visible = false;
            mainGroup.highway.material.opacity = 1.0
            leftSideGroup.highway.material.opacity = SIDE_LANE_OPACITY;
          }
          // then set everything to false and empty the targets
          inRotationAnimation = false;
          rotationAnimationStartsAt = undefined;
          currentRotationAnimationTargets.length = 0;
        } else {
          const NORMALIZED_TIME = (elapsedTime - rotationAnimationStartsAt) / ROTATION_DURATION;
          if (rotationAnimationDirection === SHIFT_INSTRUCTION.GO_LEFT) {
            mainGroup.highway.material.opacity = lerpyMcLerpLerp(SIDE_LANE_OPACITY, 1.0, NORMALIZED_TIME);
            rightSideGroup.highway.material.opacity = lerpyMcLerpLerp(1.0, SIDE_LANE_OPACITY, NORMALIZED_TIME);
          } else {
            mainGroup.highway.material.opacity = lerpyMcLerpLerp(SIDE_LANE_OPACITY, 1.0, NORMALIZED_TIME);
            leftSideGroup.highway.material.opacity = lerpyMcLerpLerp(1.0, SIDE_LANE_OPACITY, NORMALIZED_TIME);
          }
          for (const target of currentRotationAnimationTargets) {
            target.target.quaternion.copy(
              target.qstart
                .clone()
                .slerp(target.qend, NORMALIZED_TIME)
            );
            target.target.position.copy(
              target.pstart.clone().lerp(target.pend, NORMALIZED_TIME)
            );
          }
        }
      }
      mainGroup.laneNoteMesh.material.uniforms.uTime.value = elapsedTime;
      mainGroup.railNoteMesh.material.uniforms.uTime.value = elapsedTime;
      leftSideGroup.laneNoteMesh.material.uniforms.uTime.value = elapsedTime;
      leftSideGroup.railNoteMesh.material.uniforms.uTime.value = elapsedTime;
      rightSideGroup.laneNoteMesh.material.uniforms.uTime.value = elapsedTime;
      rightSideGroup.railNoteMesh.material.uniforms.uTime.value = elapsedTime;
      const index = Math.floor(elapsedTime * TABLE_DENSITY_PER_SECOND);
      const activeLanes = mainGroup.laneNoteTable[index];
      for (var i = 0; i < activeLanes.length; i++) {
        if (activeLanes[i] === undefined) {
          continue;
        }
        if (
          elapsedTime > mainGroup.laneNoteInfo[activeLanes[i]].timing + 0.1 &&
          !mainGroup.laneNoteInfo[activeLanes[i]].hasHit
        ) {
          comboCount = 0;
          scoreSpan.textContent = "Miss!";
          comboSpan.textContent = comboCount;
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
