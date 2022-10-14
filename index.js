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

    const xs = [
        -4.1, 0.0, 4.1
    ];
    const ys = [
        4.1, 0.0, -4.1
    ];
    const noteInfos = [];

    let timing = 1.0;
    for (const x of xs) {
        for (const y of ys) {
            noteInfos.push({ timing, x, y, z: -5.0 });
            timing += 0.20;
        }
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

            for (const { timing, matrix, index } of heavenlyBodiesActive.toArray()) {
                bufferVector3.setFromMatrixPosition(matrix);
                bufferVector3.z = interpolate(elapsedTime, [timing - context.movementThreshold, timing], [-4.8, 0.0]);
                heavenlyBodiesMesh.setMatrixAt(index, matrix.setPosition(bufferVector3));
            }

            while (true) {
                const latestNote = heavenlyBodiesActive.peekFront();
                if (latestNote === undefined) {
                    break;
                }
                if (elapsedTime > latestNote.timing + 0.1) {
                    heavenlyBodiesActive.removeFront();
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
