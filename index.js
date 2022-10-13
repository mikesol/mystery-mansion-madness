"use strict";

import GUI from "lil-gui";
import * as eruda from "eruda";
import Stats from "stats.js";
import * as three from "three";
import { createCamera } from "./camera.js";

eruda.init();

const main = () => {
    const gui = new GUI();
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    const canvas = document.getElementById("joyride-canvas");
    const renderer = new three.WebGLRenderer({ canvas, alpha: true });
    const camera = createCamera(canvas.clientWidth / canvas.clientHeight);

    const scene = new three.Scene();

    const context = {
        toggleFullScreen: function () {
            if (document.fullscreenElement !== null) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        },
    };

    gui.add(context, "toggleFullScreen").name("Toggle Full Screen");

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

    const renderLoop = () => {
        requestAnimationFrame(renderLoop);
        tryResizeRendererToDisplay();

        stats.begin();
        renderer.render(scene, camera);
        stats.end();
    };

    requestAnimationFrame(renderLoop);
}

main();
