"use strict";

import GUI from "lil-gui";
import * as eruda from "eruda";
import Stats from "stats.js";
import * as three from "three";
import { createCamera } from "./camera.js";
import { createLaneNotes, createRailNotes, LANE_COLUMN, LANE_NOTE_POSITION_Z, RAIL_COLUMN, RAIL_NOTE_POSITION_Z } from './core/notes.js';
import { createHighway, createJudge, createRailJudge, createRails, createLaneDim, createRailDim } from './core/plane.js';
import { createLaneTouchArea, createRailTouchArea, LANE_TOUCH_AREA_COLUMN, RAIL_TOUCH_AREA_COLUMN } from './core/touch.js';

eruda.init();

const interpolate = (value, r1, r2) => {
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
}

const main = () => {
    const gui = new GUI();
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    const canvas = document.getElementById("joyride-canvas");
    const renderer = new three.WebGLRenderer({ canvas, alpha: true });
    const camera = createCamera(canvas.clientWidth / canvas.clientHeight);
    const raycaster = new three.Raycaster();

    const scene = new three.Scene();
    const { laneNoteMesh, laneNoteMatrices } = createLaneNotes([
        { timing: 1.5, column: LANE_COLUMN.FAR_LEFT },
        { timing: 2.0, column: LANE_COLUMN.NEAR_LEFT },
        { timing: 2.5, column: LANE_COLUMN.NEAR_RIGHT },
        { timing: 3.0, column: LANE_COLUMN.FAR_RIGHT },
    ]);
    scene.add(laneNoteMesh);
    const { railNoteMesh, railNoteMatrices } = createRailNotes([
        { timing: 1.5, column: RAIL_COLUMN.LEFT },
        { timing: 3.0, column: RAIL_COLUMN.RIGHT },
    ]);
    scene.add(railNoteMesh);

    const highway = createHighway();
    scene.add(highway);
    const judge = createJudge();
    scene.add(judge);
    const rails = createRails();
    scene.add(rails);
    const railJudge = createRailJudge();
    scene.add(railJudge);

    const dims = [
        createLaneDim(LANE_COLUMN.FAR_LEFT),
        createLaneDim(LANE_COLUMN.NEAR_LEFT),
        createLaneDim(LANE_COLUMN.NEAR_RIGHT),
        createLaneDim(LANE_COLUMN.FAR_RIGHT),
        createRailDim(RAIL_COLUMN.LEFT),
        createRailDim(RAIL_COLUMN.RIGHT),
    ];
    for (const laneDim of dims) {
        scene.add(laneDim);
    }

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

    let audioContext = null;
    let beginTime = null;
    let isPlaying = false;

    const context = {
        noteSpeed: 0.025,
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
            if (audioContext === null) {
                audioContext = new AudioContext();
            }
            beginTime = audioContext.currentTime;
            isPlaying = true;
        },
    };

    gui.add(context, "toggleDims").name("Toggle Dims");
    gui.add(context, "toggleFullScreen").name("Toggle Full Screen");
    gui.add(context, "noteSpeed", 0, 0.1).name("Note Speed");
    gui.add(context, "togglePlayBack").name("Toggle Playback");

    const tryResizeRendererToDisplay = () => {
        const canvas = renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width = canvas.clientWidth * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
    }

    const pointerBuffer = new three.Vector2();
    const positionBuffer = new three.Vector3();
    const touching = {};

    const onStart = (event) => {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            pointerBuffer.x = (touch.clientX / window.innerWidth) * 2 - 1;
            pointerBuffer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointerBuffer, camera);
            const intersects = raycaster.intersectObjects(touchAreas);
            if (intersects.length === 0) {
                continue;
            }
            for (const { object: { uuid } } of intersects) {
                touching[touch.identifier] = touchAreas.findIndex(element => element.uuid === uuid);
            }
        }
        for (const index of Object.values(touching)) {
            dims[index].visible = true;
        }
    };

    const onMove = (event) => {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            pointerBuffer.x = (touch.clientX / window.innerWidth) * 2 - 1;
            pointerBuffer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointerBuffer, camera);
            const intersects = raycaster.intersectObjects(touchAreas);
            if (intersects.length === 0) {
                if (touch.identifier in touching) {
                    dims[touching[touch.identifier]].visible = false;
                    delete touching[touch.identifier];
                }
                continue;
            }
            for (const { object: { uuid } } of intersects) {
                if (touch.identifier in touching) {
                    const touchIndex = touchAreas.findIndex(element => element.uuid === uuid);
                    if (touching[touch.identifier] !== touchIndex) {
                        dims[touching[touch.identifier]].visible = false;
                        touching[touch.identifier] = touchIndex;
                        dims[touching[touch.identifier]].visible = true;
                    }
                }
            }
        }
    };

    const onEnd = (event) => {
        event.preventDefault();
        for (const touch of event.changedTouches) {
            if (touch.identifier in touching) {
                dims[touching[touch.identifier]].visible = false;
                delete touching[touch.identifier];
            }
        }
    };

    canvas.addEventListener("touchstart", onStart);
    canvas.addEventListener("touchmove", onMove);
    canvas.addEventListener("touchend", onEnd);

    const movementThreshold = 1.0;

    const renderLoop = () => {
        stats.begin();

        raycaster.setFromCamera(pointerBuffer, camera);

        if (isPlaying) {
            const elapsedTime = audioContext.currentTime - beginTime;

            for (const [index, { timing, matrix }] of laneNoteMatrices.entries()) {
                if (timing - elapsedTime < 0) {
                    continue;
                }
                if (elapsedTime > timing - movementThreshold) {
                    positionBuffer.setFromMatrixPosition(matrix);
                    positionBuffer.z = interpolate(elapsedTime, [timing - movementThreshold, timing], [-4.8, 0.0]);
                    laneNoteMesh.setMatrixAt(index, matrix.setPosition(positionBuffer));
                }
            }

            for (const [index, { timing, matrix }] of railNoteMatrices.entries()) {
                if (timing - elapsedTime < 0) {
                    continue;
                }
                if (elapsedTime > timing - movementThreshold) {
                    positionBuffer.setFromMatrixPosition(matrix);
                    positionBuffer.z = interpolate(elapsedTime, [timing - movementThreshold, timing], [-4.8, 0.0]);
                    railNoteMesh.setMatrixAt(index, matrix.setPosition(positionBuffer));
                }
            }

            laneNoteMesh.instanceMatrix.needsUpdate = true;
            railNoteMesh.instanceMatrix.needsUpdate = true;
        }

        tryResizeRendererToDisplay();
        renderer.render(scene, camera);
        requestAnimationFrame(renderLoop);

        stats.end();
    };

    requestAnimationFrame(renderLoop);
}

main();
