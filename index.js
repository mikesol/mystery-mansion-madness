"use strict";

import GUI from "lil-gui";
import * as eruda from "eruda";
import Stats from "stats.js";
import * as three from "three";
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createCamera } from "./camera.js";
import { createLaneNotes, createRailNotes, LANE_COLUMN, RAIL_COLUMN } from './core/notes.js';
import { createHighway, createJudge, createRailJudge, createRails, createLaneDim, createRailDim } from './core/plane.js';
import { createLaneTouchArea, createRailTouchArea, LANE_TOUCH_AREA_COLUMN, RAIL_TOUCH_AREA_COLUMN } from './core/touch.js';
import Deque from "double-ended-queue";

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
    const cssRenderer = new CSS2DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0px';
    document.body.appendChild(cssRenderer.domElement);
    const camera = createCamera(canvas.clientWidth / canvas.clientHeight);
    const raycaster = new three.Raycaster();

    const scene = new three.Scene();
    let notes = [];
    let lanes = [
        LANE_COLUMN.FAR_LEFT,
        LANE_COLUMN.NEAR_LEFT,
        LANE_COLUMN.NEAR_RIGHT,
        LANE_COLUMN.FAR_RIGHT,
    ];
    for (let i = 1.5, j = 0; i < 31.0; i += 0.20, j = (j + 1) % 4) {
        notes.push({ timing: i, column: lanes[j] });
    }
    const { laneNoteMesh, laneNoteInfo } = createLaneNotes(notes);
    scene.add(laneNoteMesh);

    notes = [];
    lanes = [
        RAIL_COLUMN.LEFT,
        RAIL_COLUMN.RIGHT,
    ];
    for (let i = 1.5, j = 0; i < 31.0; i += 0.80, j = (j + 1) % 2) {
        notes.push({ timing: i, column: lanes[j] });
    }
    const { railNoteMesh, railNoteInfo } = createRailNotes(notes);
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

    const scoreSpan = document.createElement('span');
    scoreSpan.id = "score-text";
    scoreSpan.textContent = "...";
    const scoreLabel = new CSS2DObject(scoreSpan);
    scene.add(scoreLabel);

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
            cssRenderer.setSize(window.innerWidth, window.innerHeight);
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
    }

    const pointerBuffer = new three.Vector2();
    const positionBuffer = new three.Vector3();
    const touching = {};

    const onStart = (event) => {
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
        for (const touch of event.changedTouches) {
            if (touch.identifier in touching) {
                dims[touching[touch.identifier]].visible = false;
                delete touching[touch.identifier];
            }
        }
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
            for (const { object: { uuid } } of intersects) {
                const touchIndex = touchAreas.findIndex(element => element.uuid === uuid);
                const touchColumn = ["-1.5", "-0.5", "0.5", "1.5", "-1", "1"][touchIndex];

                for (const [column, notes] of Object.entries(activeLaneNoteInfo)) {
                    if (notes.length === 0 || column !== touchColumn) {
                        continue;
                    }
                    const latestNote = notes.peekFront();
                    if (latestNote.hasHit) {
                        continue;
                    }
                    if (elapsedTime > latestNote.timing - 0.1 && elapsedTime < latestNote.timing + 0.1) {
                        const untilPerfect = Math.abs(elapsedTime - latestNote.timing);
                        if (untilPerfect < 0.016) {
                            scoreSpan.textContent = "Perfect! " + touchColumn;
                            latestNote.hasHit = true;
                        } else if (untilPerfect < 0.032) {
                            scoreSpan.textContent = "Perfect " + touchColumn;
                            latestNote.hasHit = true;
                        } else if (untilPerfect < 0.050) {
                            scoreSpan.textContent = "Near " + touchColumn;
                            latestNote.hasHit = true;
                        }
                    }
                }

                for (const [column, notes] of Object.entries(activeRailNoteInfo)) {
                    if (notes.length === 0 || column !== touchColumn) {
                        continue;
                    }
                    const latestNote = notes.peekFront();
                    if (latestNote.hasHit) {
                        continue;
                    }
                    if (elapsedTime > latestNote.timing - 0.1 && elapsedTime < latestNote.timing + 0.1) {
                        const untilPerfect = Math.abs(elapsedTime - latestNote.timing);
                        if (untilPerfect < 0.016) {
                            scoreSpan.textContent = "Perfect! " + touchColumn;
                            latestNote.hasHit = true;
                        } else if (untilPerfect < 0.032) {
                            scoreSpan.textContent = "Perfect " + touchColumn;
                            latestNote.hasHit = true;
                        } else if (untilPerfect < 0.050) {
                            scoreSpan.textContent = "Near " + touchColumn;
                            latestNote.hasHit = true;
                        }
                    }
                }
            }
        }
    };

    document.documentElement.addEventListener("touchstart", handleTouch);
    document.documentElement.addEventListener("touchstart", onStart);
    document.documentElement.addEventListener("touchmove", onMove);
    document.documentElement.addEventListener("touchend", onEnd);

    const movementThreshold = 1.5;

    const activeLaneNoteInfo = {};
    for (const key of Object.keys(laneNoteInfo)) {
        activeLaneNoteInfo[key] = new Deque();
    }
    const activeRailNoteInfo = {};
    for (const key of Object.keys(railNoteInfo)) {
        activeRailNoteInfo[key] = new Deque();
    }

    const renderLoop = () => {
        raycaster.setFromCamera(pointerBuffer, camera);

        if (isPlaying) {
            const elapsedTime = audioContext.currentTime - beginTime;

            for (const [index, notes] of Object.entries(laneNoteInfo)) {
                while (true) {
                    const latestNote = notes.at(-1);
                    if (latestNote === undefined) {
                        break;
                    }
                    if (elapsedTime > latestNote.timing - movementThreshold) {
                        activeLaneNoteInfo[index].push(notes.pop());
                    } else {
                        break;
                    }
                }
            }

            for (const [index, notes] of Object.entries(railNoteInfo)) {
                while (true) {
                    const latestNote = notes.at(-1);
                    if (latestNote === undefined) {
                        break;
                    }
                    if (elapsedTime > latestNote.timing - movementThreshold) {
                        activeRailNoteInfo[index].push(notes.pop());
                    } else {
                        break;
                    }
                }
            }

            for (const notes of Object.values(activeLaneNoteInfo)) {
                for (const { timing, matrix, index } of notes.toArray()) {
                    positionBuffer.setFromMatrixPosition(matrix);
                    positionBuffer.z = interpolate(elapsedTime, [timing - movementThreshold, timing], [-4.8, 0.0]);
                    laneNoteMesh.setMatrixAt(index, matrix.setPosition(positionBuffer));
                }
                while (true) {
                    const latestNote = notes.peekFront();
                    if (latestNote === undefined) {
                        break;
                    }
                    if (elapsedTime > latestNote.timing + 0.1) {
                        notes.removeFront();
                    } else {
                        break;
                    }
                }
            }

            for (const notes of Object.values(activeRailNoteInfo)) {
                for (const { timing, matrix, index } of notes.toArray()) {
                    positionBuffer.setFromMatrixPosition(matrix);
                    positionBuffer.z = interpolate(elapsedTime, [timing - movementThreshold, timing], [-4.8, 0.0]);
                    railNoteMesh.setMatrixAt(index, matrix.setPosition(positionBuffer));
                }
                while (true) {
                    const latestNote = notes.peekFront();
                    if (latestNote === undefined) {
                        break;
                    }
                    if (elapsedTime > latestNote.timing + 0.1) {
                        notes.removeFront();
                    } else {
                        break;
                    }
                }
            }

            laneNoteMesh.instanceMatrix.needsUpdate = true;
            railNoteMesh.instanceMatrix.needsUpdate = true;
        }

        tryResizeRendererToDisplay();

        stats.begin();
        renderer.render(scene, camera);
        cssRenderer.render(scene, camera);
        stats.end();

        requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
}

main();
