"use strict";

import { Camera } from "ogl";

const CAMERA_X_POSITION = 0.0;
const CAMERA_Y_POSITION = 0.5;
const CAMERA_Z_POSITION = 0.1;

const CAMERA_X_ROTATION = -0.75;
const CAMERA_Y_ROTATION = 0.0;
const CAMERA_Z_ROTATION = 0.0;

const CAMERA_FOV = 90.0;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 10.0;

export const createCamera = (gl, { aspect }) => {
  const camera = new Camera(gl, {
    fov: CAMERA_FOV,
    aspect,
    near: CAMERA_NEAR,
    far: CAMERA_FAR,
  });
  camera.position.set(CAMERA_X_POSITION, CAMERA_Y_POSITION, CAMERA_Z_POSITION);
  camera.rotation.set(CAMERA_X_ROTATION, CAMERA_Y_ROTATION, CAMERA_Z_ROTATION);
  return camera;
};
