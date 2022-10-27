"use strict";

import { Box, Program, Mesh } from "ogl";
import { BASIC_FRAGMENT, BASIC_VERTEX } from "../gl/basic";

import {
  HIGHWAY_SCALE_X,
  HIGHWAY_SCALE_Y,
  RAIL_OFFSET,
  RAIL_ROTATION,
  RAIL_SCALE_X,
  RAIL_SCALE_Y,
} from "./plane";

export const LANE_TOUCH_AREA_SCALE_X = HIGHWAY_SCALE_X / 4;
export const LANE_TOUCH_AREA_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_TOUCH_AREA_SCALE_Z = 0.5;
export const LANE_TOUCH_AREA_POSITION_Y = 0.0005;
export const LANE_TOUCH_AREA_POSITION_Z = 0.0;
export const LANE_TOUCH_AREA_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: LANE_TOUCH_AREA_SCALE_X,
    height: LANE_TOUCH_AREA_SCALE_Y,
    depth: LANE_TOUCH_AREA_SCALE_Z,
  });
export const LANE_TOUCH_AREA_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 0.0 },
      uG: { value: 0.0 },
      uB: { value: 0.0 },
      uA: { value: 0.0 },
    },
  });

export const LANE_TOUCH_AREA_COLUMN = {
  FAR_LEFT: -1.5,
  NEAR_LEFT: -0.5,
  NEAR_RIGHT: 0.5,
  FAR_RIGHT: 1.5,
};

export const createLaneTouchArea = ({ gl, column }) => {
  const mesh = new Mesh(gl, {
    geometry: LANE_TOUCH_AREA_GEOMETRY({ gl }),
    program: LANE_TOUCH_AREA_MATERIAL({ gl }),
  });
  mesh.position.set(
    LANE_TOUCH_AREA_SCALE_X * column,
    LANE_TOUCH_AREA_POSITION_Y,
    LANE_TOUCH_AREA_POSITION_Z
  );
  mesh.visible = false;
  return mesh;
};

export const RAIL_TOUCH_AREA_SCALE_X = RAIL_SCALE_X;
export const RAIL_TOUCH_AREA_SCALE_Y = RAIL_SCALE_Y;
export const RAIL_TOUCH_AREA_SCALE_Z = 0.5;
export const RAIL_TOUCH_AREA_POSITION_Z = 0.0;
export const RAIL_TOUCH_AREA_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: RAIL_TOUCH_AREA_SCALE_X,
    height: RAIL_TOUCH_AREA_SCALE_Y,
    depth: RAIL_TOUCH_AREA_SCALE_Z,
  });
export const RAIL_TOUCH_AREA_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 0.0 },
      uG: { value: 0.0 },
      uB: { value: 0.0 },
      uA: { value: 0.0 },
    },
  });
export const RAIL_TOUCH_AREA_COLUMN = {
  LEFT: -1,
  RIGHT: 1,
};

export const createRailTouchArea = ({ gl, column }) => {
  const mesh = new Mesh(gl, {
    geometry: RAIL_TOUCH_AREA_GEOMETRY({ gl }),
    program: RAIL_TOUCH_AREA_MATERIAL({ gl }),
  });
  mesh.rotation.set(0.0, 0.0, RAIL_ROTATION * column);
  mesh.position.set(
    (HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.0001) * column,
    RAIL_OFFSET + 0.0005,
    RAIL_TOUCH_AREA_POSITION_Z
  );
  mesh.visible = false;
  return mesh;
};
