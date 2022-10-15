"use strict";

import GUI from "lil-gui";
import * as eruda from "eruda";
import Stats from "stats.js";
import * as three from "three";
import { createCamera } from "./camera.js";
import { createHeavenlyBodies } from "./core/body.js";
import Deque from "double-ended-queue";

eruda.init();

const interpolate = (value, r1, r2) => {
    return (value - r1[0]) * (r2[1] - r2[0]) / (r1[1] - r1[0]) + r2[0];
}

const randomInRange = (min, max) => {
    return Math.random() * (max - min) + min;
}

const randomElement = (xs) => {
    return xs[Math.floor(Math.random() * xs.length)];
}

const main = () => {
    const gui = new GUI();
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    const canvas = document.getElementById("joyride-canvas");
    const renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const camera = createCamera(canvas.clientWidth / canvas.clientHeight);

    const scene = new three.Scene();

    const axes = new three.AxesHelper(10.0);
    scene.add(axes);

    const light = new three.PointLight(0xFFFFFF, 1, 100);
    light.position.set(0.0, 0.0, 10.0);
    scene.add(light);

    const gridLocations = [ -3.5, 0.0, 3.5 ];
    const noteInfos = [];

    for (let timing = 1.0; timing < 30.0; timing += 0.50) {
        const initialX = randomInRange(-5.0, 5.0);
        const initialY = randomInRange(-5.0, 5.0);

        let targetX = null;
        let targetY = null;

        while (true) {
            targetX = randomElement(gridLocations);
            targetY = randomElement(gridLocations);
            const lastNote = noteInfos.at(-1);
            if (lastNote === undefined) {
                break;
            }
            if (lastNote.targetX !== targetX || lastNote.targetY !== targetY) {
                break;
            }
        }

        noteInfos.push({
            timing,
            initialX,
            initialY,
            initialZ: -10.0,
            targetX,
            targetY,
            targetZ: 0.0,
        });
    }

    const { mesh: heavenlyBodiesMesh, notes: heavenlyBodiesInfos } = createHeavenlyBodies(noteInfos);

    scene.add(heavenlyBodiesMesh);

    let audioContext = null;
    let beginTime = null;

    const context = {
        movementThreshold: 1.0,
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
        }
    };

    gui.add(context, "toggleFullScreen").name("Toggle Full Screen");
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

    const bufferVector3 = new three.Vector3();
    const bufferColor = new three.Color();
    const heavenlyBodiesActive = new Deque();

    const renderLoop = () => {
        requestAnimationFrame(renderLoop);
        tryResizeRendererToDisplay();

        if (audioContext !== null) {
            const elapsedTime = audioContext.currentTime - beginTime;

            while (true) {
                const latestNote = heavenlyBodiesInfos.at(-1);
                if (latestNote === undefined) {
                    break;
                }
                if (elapsedTime > latestNote.timing - context.movementThreshold) {
                    heavenlyBodiesActive.push(heavenlyBodiesInfos.pop());
                } else {
                    break;
                }
            }

            for (const { timing, matrix, index, initialX, initialY, initialZ, targetX, targetY, targetZ } of heavenlyBodiesActive.toArray()) {
                const movementStart = timing - context.movementThreshold;

                bufferVector3.setFromMatrixPosition(matrix);
                bufferVector3.set(
                    interpolate(elapsedTime, [movementStart, timing], [initialX, targetX]),
                    interpolate(elapsedTime, [movementStart, timing], [initialY, targetY]),
                    interpolate(elapsedTime, [movementStart, timing], [initialZ, targetZ]),
                );
                heavenlyBodiesMesh.setMatrixAt(index, matrix.setPosition(bufferVector3));

                if (elapsedTime > timing + 0.075) {
                    heavenlyBodiesMesh.setColorAt(index, bufferColor.setHex(0xFF0000));
                    heavenlyBodiesMesh.instanceColor.needsUpdate = true;
                } else if (elapsedTime > timing - 0.075) {
                    heavenlyBodiesMesh.setColorAt(index, bufferColor.setHex(0x00FF00));
                    heavenlyBodiesMesh.instanceColor.needsUpdate = true;
                } else if (elapsedTime > timing - 0.1) {
                    heavenlyBodiesMesh.setColorAt(index, bufferColor.setHex(0xFF0000));
                    heavenlyBodiesMesh.instanceColor.needsUpdate = true;
                }
            }

            while (true) {
                const latestNote = heavenlyBodiesActive.peekFront();
                if (latestNote === undefined) {
                    break;
                }
                if (elapsedTime > latestNote.timing + 0.1) {
                    const latestNote = heavenlyBodiesActive.removeFront();
                    bufferVector3.set(0.0, 0.0, 20.0);
                    heavenlyBodiesMesh.setMatrixAt(latestNote.index, latestNote.matrix.setPosition(bufferVector3));
                } else {
                    break;
                }
            }

            heavenlyBodiesMesh.instanceMatrix.needsUpdate = true;
        }

        stats.begin();
        renderer.render(scene, camera);
        stats.end();
    };

    requestAnimationFrame(renderLoop);
}

main();
