"use strict";

import GUI from "lil-gui";
import * as eruda from "eruda";
import "flowbite";
import $ from "jquery";
import Stats from "stats.js";
import * as three from "three";
import { GROUPS } from "./core/groups";
import { createCamera } from "./camera.js";
import { SPOOKY_LANES } from "./core/halloween0.js";
import oneX from "./assets/1xalpha.png";
import twoX from "./assets/2xalpha.png";
import threeX from "./assets/3xalpha.png";
import fiveX from "./assets/5xalpha.png";
import eightX from "./assets/8xalpha.png";
import Swal from "sweetalert2";
import ClipboardJS from "clipboard";
import MobileDetect from "mobile-detect";

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
  createMultiplier,
} from "./core/plane.js";
import {
  createLaneTouchArea,
  createRailTouchArea,
  LANE_TOUCH_AREA_COLUMN,
  RAIL_TOUCH_AREA_COLUMN,
} from "./core/touch.js";
import {
  GREAT_MULTIPLIER,
  OK_MULTIPLIER,
  PERFECT_MULTIPLIER,
  SCORE_MULTIPLIERS,
} from "./core/scoring";
import { getAudioData } from "./io/soundfile";
import { doSignIn } from "./firebase/auth";
import { JUDGEMENT_CONSTANTS } from "./judgement/judgement";

const md = new MobileDetect(window.navigator.userAgent);
const IS_MOBILE = md.mobile() ? true : false

const negMod = (x, n) => ((x % n) + n) % n;
const lerpyMcLerpLerp = (a, b, t) => a * (1 - t) + b * t;

const SHIFT_INSTRUCTION = {
  GO_LEFT: 0,
  GO_RIGHT: 1,
};

const ROTATION_DURATION = 0.6;

const makeGroup = ({ scene, side, groupId, multtxt }) => {
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
  if (side !== SIDES.CENTER) {
    highway.material.opacity = SIDE_LANE_OPACITY;
  }
  sideGroup.add(highway);
  const multiplier = createMultiplier({ multtxt });
  sideGroup.add(multiplier);
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
    groupId,
    laneNoteMesh,
    laneNoteInfo,
    laneNoteTable,
    railNoteMesh,
    railNoteInfo,
    railNoteTable,
  };
};

const main = async () => {
  // dev
  const gui = new GUI();
  if (import.meta.env.PROD) {
    gui.hide();
  }
  const stats = new Stats();
  stats.showPanel(0);
  if (import.meta.env.DEV) {
    document.body.appendChild(stats.dom);
    eruda.init();
  }

  // top-level lets and consts
  const score = {
    score: 0,
    highestCombo: 0,
  };
  let comboCount = 0;
  let audioContext = null;
  let beginTime = null;
  let isPlaying = false;

  const togglePlayBack =
    ({ audioDataPromise }) =>
    async () => {
      if (audioContext) {
        audioContext.close();
      }
      audioContext = new AudioContext();
      const incoming = await audioDataPromise;

      audioContext.decodeAudioData(
        incoming,
        (buffer) => {
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.start(audioContext.currentTime);
          beginTime = audioContext.currentTime;
          isPlaying = true;
        },

        (e) => console.error(`Error with decoding audio data: ${e.err}`)
      );
    };

  const doGame = async ({ audioDataPromise }) => {
    // textures
    const loader = new three.TextureLoader();
    const [t1x, t2x, t3x, t5x, t8x] = await Promise.all([
      loader.loadAsync(oneX),
      loader.loadAsync(twoX),
      loader.loadAsync(threeX),
      loader.loadAsync(fiveX),
      loader.loadAsync(eightX),
    ]);

    // canvas
    const canvas = document.getElementById("joyride-canvas");
    // renderer
    const renderer = new three.WebGLRenderer({ canvas, alpha: true });
    // camera
    const camera = createCamera(canvas.clientWidth / canvas.clientHeight);
    //raycaster
    const raycaster = new three.Raycaster();

    // scene
    const scene = new three.Scene();

    const ALL_GROUPS = [
      makeGroup({
        scene,
        multtxt: t1x,
        side: SIDES.CENTER,
        groupId: GROUPS.LOWEST,
      }),
      makeGroup({
        scene,
        multtxt: t2x,
        side: SIDES.LEFT_SIDE,
        groupId: GROUPS.LOW_LEFT,
      }),
      makeGroup({
        scene,
        multtxt: t3x,
        side: SIDES.LEFT_ON_DECK,
        groupId: GROUPS.MID_LEFT,
      }),
      makeGroup({
        scene,
        multtxt: t5x,
        side: SIDES.OFF_SCREEN,
        groupId: GROUPS.HIGH_LEFT,
      }),
      makeGroup({
        scene,
        multtxt: t8x,
        side: SIDES.OFF_SCREEN,
        groupId: GROUPS.HIGHEST,
      }),
      makeGroup({
        scene,
        multtxt: t5x,
        side: SIDES.OFF_SCREEN,
        groupId: GROUPS.HIGH_RIGHT,
      }),
      makeGroup({
        scene,
        multtxt: t3x,
        side: SIDES.RIGHT_ON_DECK,
        groupId: GROUPS.MID_RIGHT,
      }),
      makeGroup({
        scene,
        multtxt: t2x,
        side: SIDES.RIGHT_SIDE,
        groupId: GROUPS.LOW_RIGHT,
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

    $("#intro-screen").addClass("hidden");
    $("#score-grid").removeClass("hidden");
    const scoreSpan = $("#score-text");
    const comboSpan = $("#combo-text");
    const realScore = $("#real-score");

    const context = {
      movementThreshold: 1.0,
      toggleFullScreen: function () {
        if (document.fullscreenElement !== null) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      },
      togglePlayBack: togglePlayBack({ audioDataPromise }),
    };

    if (import.meta.env.DEV) {
      gui.add(context, "toggleFullScreen").name("Toggle Full Screen");
      gui
        .add(context, "movementThreshold", 0.5, 1.5)
        .name("Movement Threshold");
      // gui.add(context, "togglePlayBack").name("Toggle Playback");
    }
    const tryResizeRendererToDisplay = () => {
      const canvas = renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const width = (canvas.clientWidth * pixelRatio) | 0;
      const height = (canvas.clientHeight * pixelRatio) | 0;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
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
        ALL_GROUPS[negMod(previousGroupIndex - 2, 8)].sideGroup.applyMatrix4(
          OFF_SCREEN_M4
        );
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
        ALL_GROUPS[negMod(previousGroupIndex + 2, 8)].sideGroup.applyMatrix4(
          OFF_SCREEN_M4
        );
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

      for (const touch of (IS_MOBILE ? event.changedTouches : [event])) {
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
            elapsedTime >
              latestLaneNote.timing -
                JUDGEMENT_CONSTANTS.CONSIDERATION_WINDOW &&
            elapsedTime <
              latestLaneNote.timing + JUDGEMENT_CONSTANTS.CONSIDERATION_WINDOW
          ) {
            const untilPerfect = Math.abs(elapsedTime - latestLaneNote.timing);
            let scoreMultiplier = undefined;
            if (untilPerfect < JUDGEMENT_CONSTANTS.PERFECTION) {
              comboCount += 1;
              scoreMultiplier;
              scoreSpan.text("Perfect!");
              comboSpan.text(comboCount);
              latestLaneNote.hasHit = true;
              scoreMultiplier = PERFECT_MULTIPLIER;
            } else if (untilPerfect < JUDGEMENT_CONSTANTS.ALMOST) {
              comboCount += 1;
              scoreSpan.text("Nice");
              comboSpan.text(comboCount);
              latestLaneNote.hasHit = true;
              scoreMultiplier = GREAT_MULTIPLIER;
            } else {
              comboCount += 1;
              scoreSpan.text("Almost");
              comboSpan.text(comboCount);
              latestLaneNote.hasHit = true;
              scoreMultiplier = OK_MULTIPLIER;
            }
            score.score +=
              scoreMultiplier *
              (1 + comboCount) *
              SCORE_MULTIPLIERS[mainGroup.groupId];
            score.highestCombo = Math.max(score.highestCombo, comboCount);
            realScore.text(score.score.toFixed(1));
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
            scoreSpan.text(touchIndex === 4 ? "Shift Left!" : "Shift Right!");
            comboSpan.text("");
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

    if (!IS_MOBILE) {
      document.documentElement.addEventListener("click", handleTouch);
    } else {
      document.documentElement.addEventListener("touchstart", handleTouch);
    }

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
              mainGroup.highway.material.opacity = 1.0;
              rightSideGroup.highway.material.opacity = SIDE_LANE_OPACITY;
            } else {
              // something to the far off left should be invisible
              ALL_GROUPS[negMod(currentGroupIndex + 2, 8)].visible = false;
              mainGroup.highway.material.opacity = 1.0;
              leftSideGroup.highway.material.opacity = SIDE_LANE_OPACITY;
            }
            // then set everything to false and empty the targets
            inRotationAnimation = false;
            rotationAnimationStartsAt = undefined;
            currentRotationAnimationTargets.length = 0;
          } else {
            const NORMALIZED_TIME =
              (elapsedTime - rotationAnimationStartsAt) / ROTATION_DURATION;
            if (rotationAnimationDirection === SHIFT_INSTRUCTION.GO_LEFT) {
              mainGroup.highway.material.opacity = lerpyMcLerpLerp(
                SIDE_LANE_OPACITY,
                1.0,
                NORMALIZED_TIME
              );
              rightSideGroup.highway.material.opacity = lerpyMcLerpLerp(
                1.0,
                SIDE_LANE_OPACITY,
                NORMALIZED_TIME
              );
            } else {
              mainGroup.highway.material.opacity = lerpyMcLerpLerp(
                SIDE_LANE_OPACITY,
                1.0,
                NORMALIZED_TIME
              );
              leftSideGroup.highway.material.opacity = lerpyMcLerpLerp(
                1.0,
                SIDE_LANE_OPACITY,
                NORMALIZED_TIME
              );
            }
            for (const target of currentRotationAnimationTargets) {
              target.target.quaternion.copy(
                target.qstart.clone().slerp(target.qend, NORMALIZED_TIME)
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
            scoreSpan.text("Miss!");
            comboSpan.text(comboCount);
            break;
          }
        }
      }

      tryResizeRendererToDisplay();

      stats.begin();
      renderer.render(scene, camera);
      stats.end();

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  };
  const introScreen = $("#intro-screen");
  const practiceScreen = $("#practice-screen");
  const instructionScreen = $("#instruction-screen");
  const scoreGrid = $("#score-grid");
  const introSpinner = $("#loading-spinner");
  // do not await until needed
  const audioDataPromise = getAudioData();
  // routing
  const routing = (() => {
    const hash = window.location.hash;
    return { hash };
  })();
  const hashChange = async () => {
    await doSignIn();
    routing.hash = window.location.hash;
    if (routing.hash.substring(0, 4) === "#/r/") {
      instructionScreen.addClass("hidden");
      score;
      await doGame({ audioDataPromise });
    } else if (routing.hash.substring(0, 3) === "#/p") {
      $("#start-game-practice").on("click", async () => {
        await doGame({ audioDataPromise, practice: true });
        practiceScreen.addClass("hidden");
        scoreGrid.removeClass("hidden");
        await togglePlayBack({ audioDataPromise })();
      });
      introSpinner.addClass("hidden");
      practiceScreen.removeClass("hidden");
    } else {
      const nameInput = $("#spooky-name");
      $("#new-game").on("click", () => {
        const enteredName = nameInput.val();
        if (enteredName.length < 3 || enteredName.length > 16) {
          Swal.fire({
            title: "Gloups!",
            text: "Names must be between 3 and 16 characters",
            icon: "error",
            confirmButtonText: "Got it",
          });
        } else {
          introScreen.addClass("hidden");
          instructionScreen.removeClass("hidden");
        }
        $("#start-game").on("click", async () => {
          await doGame({ audioDataPromise, practice: false });
          instructionScreen.addClass("hidden");
          scoreGrid.removeClass("hidden");
          await togglePlayBack({ audioDataPromise })();
        });
      });
      introSpinner.addClass("hidden");
      introScreen.removeClass("hidden");
    }
  };
  new ClipboardJS(".clippy");
  $(".clippy").on("click", () => {
    Swal.fire({
      icon: "success",
      title: "Copied!",
      text: "The link is copied to your clipboard. Send it to up to 7 friends!",
      confirmButtonText: "Got it 👍",
    });
  });
  window.addEventListener("hashchange", hashChange);
  hashChange();
};

main();
