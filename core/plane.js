"use strict";

import { Box, Program, Mesh, Quat, Mat4, Vec3, Euler } from "ogl";
import { BASIC_FRAGMENT, BASIC_VERTEX } from "../gl/basic";
import { IMAGE_ALPHA, IMAGE_VERTEX } from "../gl/image";
export const MULTIPLIER_SCALE_X = 0.5;
export const MULTIPLIER_SCALE_Y = 0.001;
export const MULTIPLIER_SCALE_Z = 0.5;
export const MULTIPLIER_POSITION_X = 0.0;
export const MULTIPLIER_POSITION_Y = 0.0005;
export const MULTIPLIER_POSITION_Z = -1.0;
export const MULTIPLIER_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: MULTIPLIER_SCALE_X,
    height: MULTIPLIER_SCALE_Y,
    depth: MULTIPLIER_SCALE_Z,
  });
export const MULTIPLIER_MATERIAL = ({ gl, multtxt }) =>
  new Program(gl, {
    uniforms: {
      uTexture: { value: multtxt },
      uAlpha: { value: multtxt },
    },
    transparent: true,
    vertex: IMAGE_VERTEX,
    fragment: IMAGE_ALPHA,
  });

export const HIGHWAY_SCALE_X_BASE = 1.0;
export const HIGHWAY_SCALE_X_PADDING = 0.05;
export const HIGHWAY_SCALE_X = HIGHWAY_SCALE_X_BASE + HIGHWAY_SCALE_X_PADDING;
export const HIGHWAY_SCALE_Y = 0.001;
export const HIGHWAY_SCALE_Z = 5.0;
export const HIGHWAY_POSITION_X = 0.0;
export const HIGHWAY_POSITION_Y = 0.0;
export const HIGHWAY_POSITION_Z = -2.4;
export const HIGHWAY_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: HIGHWAY_SCALE_X,
    height: HIGHWAY_SCALE_Y,
    depth: HIGHWAY_SCALE_Z,
  });
export const HIGHWAY_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 0.20703125 },
      uG: { value: 0.203125 },
      uB: { value: 0.2109375 },
      uA: { value: 1.0 },
    },
    transparent: true,
  });

export const createHighway = ({ gl }) => {
  const mesh = new Mesh(gl, {
    geometry: HIGHWAY_GEOMETRY({ gl }),
    program: HIGHWAY_MATERIAL({ gl }),
  });
  mesh.position.set(HIGHWAY_POSITION_X, HIGHWAY_POSITION_Y, HIGHWAY_POSITION_Z);
  return mesh;
};

export const createMultiplier = ({ gl, multtxt }) => {
  const mesh = new Mesh(gl, {
    geometry: MULTIPLIER_GEOMETRY({ gl }),
    program: MULTIPLIER_MATERIAL({ gl, multtxt }),
  });
  mesh.position.set(
    MULTIPLIER_POSITION_X,
    MULTIPLIER_POSITION_Y,
    MULTIPLIER_POSITION_Z
  );
  return mesh;
};

export const JUDGE_SCALE_X = HIGHWAY_SCALE_X;
export const JUDGE_SCALE_Y = HIGHWAY_SCALE_Y;
export const JUDGE_SCALE_Z = 0.01;
export const JUDGE_POSITION_X = 0.0;
export const JUDGE_POSITION_Y = 0.003;
export const JUDGE_POSITION_Z = 0.0;
export const JUDGE_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: JUDGE_SCALE_X,
    height: JUDGE_SCALE_Y,
    depth: JUDGE_SCALE_Z,
  });
export const JUDGE_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 1.0 },
      uG: { value: 1.0 },
      uB: { value: 1.0 },
      uA: { value: 1.0 },
    },
    transparent: true,
  });

export const createJudge = ({ gl }) => {
  const mesh = new Mesh(gl, {
    geometry: JUDGE_GEOMETRY({ gl }),
    program: JUDGE_MATERIAL({ gl }),
  });
  mesh.position.set(JUDGE_POSITION_X, JUDGE_POSITION_Y, JUDGE_POSITION_Z);
  return mesh;
};

export const RAIL_SCALE_X_BASE = 0.2;
export const RAIL_SCALE_X_PADDING = 0.0125;
export const RAIL_SCALE_X = RAIL_SCALE_X_BASE + RAIL_SCALE_X_PADDING;
export const RAIL_SCALE_Y = HIGHWAY_SCALE_Y;
export const RAIL_SCALE_Z = HIGHWAY_SCALE_Z;
export const RAIL_POSITION_Z = HIGHWAY_POSITION_Z;
export const RAIL_OFFSET = RAIL_SCALE_X / 2 / Math.sqrt(2);
export const RAIL_ROTATION = (45 * Math.PI) / 180;
export const RAIL_CENTER_QUTERNION = new Quat().fromEuler(
  new Euler(0.0, 0.0, -RAIL_ROTATION)
);
export const RAIL_SIDE_QUTERNION = new Quat();
export const RAIL_CENTER_POSITION = new Vec3(
  -HIGHWAY_SCALE_X / 2 - RAIL_OFFSET,
  RAIL_OFFSET,
  0.0
);
export const RAIL_SIDE_POSITION = new Vec3(
  -HIGHWAY_SCALE_X / 2 - RAIL_SCALE_X / 2,
  0.0,
  0.0
);

export const RAIL_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: RAIL_SCALE_X,
    height: RAIL_SCALE_Y,
    depth: RAIL_SCALE_Z,
  });
export const RAIL_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 0.289 },
      uG: { value: 0.281 },
      uB: { value: 0.277 },
      uA: { value: 1.0 },
    },
    transparent: true,
  });

export const SIDES = {
  LEFT_SIDE: -42,
  CENTER: -41,
  RIGHT_SIDE: -40,
  LEFT_ON_DECK: -39,
  RIGHT_ON_DECK: -38,
  OFF_SCREEN: -35,
};

export const SIDES_CLOCKWISE = [
  SIDES.CENTER,
  SIDES.LEFT_SIDE,
  SIDES.LEFT_ON_DECK,
  SIDES.OFF_SCREEN,
  SIDES.OFF_SCREEN,
  SIDES.OFF_SCREEN,
  SIDES.RIGHT_ON_DECK,
  SIDES.RIGHT_SIDE,
];

export const createRails = ({ gl }) => {
  const mesh = new Mesh(gl, {
    geometry: RAIL_GEOMETRY({ gl }),
    program: RAIL_MATERIAL({ gl }),
  });

  const leftRailMatrix = new Mat4();
  leftRailMatrix.setPosition(new Vec3(0.0, 0.0, RAIL_POSITION_Z));
  mesh.matrix = leftRailMatrix;
  mesh.worldMatrixNeedsUpdate = true;
  return mesh;
};

export const RAIL_JUDGE_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: RAIL_SCALE_X,
    height: JUDGE_SCALE_Y,
    depth: JUDGE_SCALE_Z,
  });

export const RAIL_JUDGE_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 1.0 },
      uG: { value: 1.0 },
      uB: { value: 1.0 },
      uA: { value: 1.0 },
    },
    transparent: true,
  });

export const createRailJudge = ({ gl }) => {
  const mesh = new Mesh(gl, {
    geometry: RAIL_JUDGE_GEOMETRY({ gl }),
    program: RAIL_JUDGE_MATERIAL({ gl }),
  });

  const leftRailJudgeMatrix = new Mat4();

  leftRailJudgeMatrix.setPosition(new Vec3(0.0, 0.003, JUDGE_POSITION_Z));
  mesh.matrix = leftRailJudgeMatrix;
  mesh.worldMatrixNeedsUpdate = true;
  return mesh;
};

export const LANE_DIM_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
export const LANE_DIM_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_DIM_SCALE_Z = HIGHWAY_SCALE_Z;
export const LANE_DIM_POSITION_Y = 0.0003;
export const LANE_DIM_POSITION_Z = HIGHWAY_POSITION_Z;
export const LANE_DIM_SPACE_BETWEEN = HIGHWAY_SCALE_X_PADDING / 5;
export const LANE_DIM_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: LANE_DIM_SCALE_X,
    height: LANE_DIM_SCALE_Y,
    depth: LANE_DIM_SCALE_Z,
  });
export const LANE_DIM_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 1.0 },
      uG: { value: 1.0 },
      uB: { value: 1.0 },
      uA: { value: 0.2 },
    },
    transparent: true,
  });

export const createLaneDim = ({ gl, column }) => {
  const mesh = new Mesh(gl, {
    geometry: LANE_DIM_GEOMETRY({ gl }),
    program: LANE_DIM_MATERIAL({ gl }),
  });
  mesh.position.set(
    (LANE_DIM_SCALE_X + LANE_DIM_SPACE_BETWEEN) * column,
    LANE_DIM_POSITION_Y,
    LANE_DIM_POSITION_Z
  );
  mesh.visible = false;
  return mesh;
};

export const RAIL_DIM_SCALE_X = RAIL_SCALE_X_BASE;
export const RAIL_DIM_SCALE_Y = RAIL_SCALE_Y;
export const RAIL_DIM_SCALE_Z = RAIL_SCALE_Z;
export const RAIL_DIM_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: RAIL_SCALE_X_BASE,
    height: RAIL_SCALE_Y,
    depth: RAIL_SCALE_Z,
  });
export const RAIL_DIM_MATERIAL = ({ gl }) =>
  new Program(gl, {
    vertex: BASIC_VERTEX,
    fragment: BASIC_FRAGMENT,
    uniforms: {
      uR: { value: 1.0 },
      uG: { value: 1.0 },
      uB: { value: 1.0 },
      uA: { value: 0.2 },
    },
    transparent: true,
  });

export const createRailDim = ({ gl, column }) => {
  const mesh = new Mesh(gl, {
    geometry: RAIL_DIM_GEOMETRY({ gl }),
    program: RAIL_DIM_MATERIAL({ gl }),
  });
  mesh.rotation.set(0.0, 0.0, RAIL_ROTATION * column);
  mesh.position.set(
    (HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.0002) * column,
    RAIL_OFFSET + 0.0002,
    RAIL_POSITION_Z
  );
  mesh.visible = false;
  return mesh;
};

// middle is just identity matrix - no rotation, no translation, no scale
export const MIDDLE_M4 = new Mat4();
export const MIDDLE_POSITION = new Vec3();
export const MIDDLE_QUATERNION = new Quat();
export const MIDDLE_SCALE = new Vec3();
MIDDLE_M4.getTranslation(MIDDLE_POSITION);
MIDDLE_M4.getRotation(MIDDLE_QUATERNION);
MIDDLE_M4.getScaling(MIDDLE_SCALE);

// other planes
export const LEFT_SIDE_M4 = (() => {
  const finalM4 = new Mat4();
  const rotationM4 = new Mat4().rotate(-RAIL_ROTATION, new Vec3(0, 0, 1));
  const translationM4 = new Mat4().translate(
    // start from the position
    HIGHWAY_POSITION_X -
      // subtract half the scale to move it to the edge
      HIGHWAY_SCALE_X / 2.0 -
      // subtract one side of the rail triangle
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) -
      // subtract the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    // add one side of the rail triangle
    RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    0.0
  );
  finalM4.multiply(translationM4, rotationM4);
  return finalM4;
})();

export const LEFT_SIDE_POSITION = new Vec3();
export const LEFT_SIDE_QUATERNION = new Quat();
export const LEFT_SIDE_SCALE = new Vec3();
LEFT_SIDE_M4.getTranslation(LEFT_SIDE_POSITION);
LEFT_SIDE_M4.getRotation(LEFT_SIDE_QUATERNION);
LEFT_SIDE_M4.getScaling(LEFT_SIDE_SCALE);

export const RIGHT_SIDE_M4 = (() => {
  const finalM4 = new Mat4();
  const rotationM4 = new Mat4().rotate(RAIL_ROTATION, new Vec3(0, 0, 1));
  const translationM4 = new Mat4().translate(
    // start from the position
    HIGHWAY_POSITION_X +
      // add half the scale to move it to the edge
      HIGHWAY_SCALE_X / 2.0 +
      // add one side of the rail triangle
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    // add one side of the rail triangle
    RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    0.0
  );
  finalM4.multiply(translationM4, rotationM4);
  return finalM4;
})();

export const RIGHT_SIDE_POSITION = new Vec3();
export const RIGHT_SIDE_QUATERNION = new Quat();
export const RIGHT_SIDE_SCALE = new Vec3();
RIGHT_SIDE_M4.getTranslation(RIGHT_SIDE_POSITION);
RIGHT_SIDE_M4.getRotation(RIGHT_SIDE_QUATERNION);
RIGHT_SIDE_M4.getScaling(RIGHT_SIDE_SCALE);

export const LEFT_ON_DECK_M4 = (() => {
  const finalM4 = new Mat4();
  const rotationM4 = new Mat4().rotate(-RAIL_ROTATION, new Vec3(0, 0, 1));
  const translationM4 = new Mat4().translate(
    // start from the position
    HIGHWAY_POSITION_X -
      // subtract half the scale to move it to the edge
      HIGHWAY_SCALE_X / 2.0 -
      // subtract one side of the rail triangle
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) -
      // subtract the full currently-visible lane
      HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0) -
      // subtract the full currently-visible rail
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) -
      // subtract the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    // add one side of the rail triangle
    RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the full currently-visible lane
      HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the full currently-visible rail
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    0.0
  );
  finalM4.multiply(translationM4, rotationM4);
  return finalM4;
})();
export const LEFT_ON_DECK_POSITION = new Vec3();
export const LEFT_ON_DECK_QUATERNION = new Quat();
export const LEFT_ON_DECK_SCALE = new Vec3();
LEFT_ON_DECK_M4.getTranslation(LEFT_ON_DECK_POSITION);
LEFT_ON_DECK_M4.getRotation(LEFT_ON_DECK_QUATERNION);
LEFT_ON_DECK_M4.getScaling(LEFT_ON_DECK_SCALE);

export const RIGHT_ON_DECK_M4 = (() => {
  const finalM4 = new Mat4();
  const rotationM4 = new Mat4().rotate(RAIL_ROTATION, new Vec3(0, 0, 1));
  const translationM4 = new Mat4().translate(
    // start from the position
    HIGHWAY_POSITION_X +
      // subtract half the scale to move it to the edge
      HIGHWAY_SCALE_X / 2.0 +
      // subtract one side of the rail triangle
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // subtract the full currently-visible lane
      HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0) +
      // subtract the full currently-visible rail
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // subtract the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    // add one side of the rail triangle
    RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the full currently-visible lane
      HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the full currently-visible rail
      RAIL_SCALE_X * Math.sin(Math.PI / 4.0) +
      // add the horizontal component of the width of the rotated figure
      // which uses half the base as the hypotenuse
      (HIGHWAY_SCALE_X * Math.sin(Math.PI / 4.0)) / 2.0,
    0.0
  );
  finalM4.multiply(translationM4, rotationM4);
  return finalM4;
})();
export const RIGHT_ON_DECK_POSITION = new Vec3();
export const RIGHT_ON_DECK_QUATERNION = new Quat();
export const RIGHT_ON_DECK_SCALE = new Vec3();
RIGHT_ON_DECK_M4.getTranslation(RIGHT_ON_DECK_POSITION);
RIGHT_ON_DECK_M4.getRotation(RIGHT_ON_DECK_QUATERNION);
RIGHT_ON_DECK_M4.getScaling(RIGHT_ON_DECK_SCALE);

export const OFF_SCREEN_M4 = (() => {
  const finalM4 = new Mat4().translate(100.0, 100.0, 100.0);
  return finalM4;
})();

// opacity for side lanes
export const SIDE_LANE_OPACITY = 0.5;
