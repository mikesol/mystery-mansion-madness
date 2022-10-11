"use strict";

import * as three from "three";

export const HIGHWAY_SCALE_X_BASE = 1.0;
export const HIGHWAY_SCALE_X_PADDING = 0.05;
export const HIGHWAY_SCALE_X = HIGHWAY_SCALE_X_BASE + HIGHWAY_SCALE_X_PADDING;
export const HIGHWAY_SCALE_Y = 0.001;
export const HIGHWAY_SCALE_Z = 5.0;
export const HIGHWAY_POSITION_X = 0.0;
export const HIGHWAY_POSITION_Y = 0.0;
export const HIGHWAY_POSITION_Z = -2.4;
export const HIGHWAY_GEOMETRY = new three.BoxGeometry(
  HIGHWAY_SCALE_X,
  HIGHWAY_SCALE_Y,
  HIGHWAY_SCALE_Z
);
export const HIGHWAY_MATERIAL = new three.MeshBasicMaterial({
  color: 0x353436,
});

export const createHighway = () => {
  const mesh = new three.Mesh(HIGHWAY_GEOMETRY, HIGHWAY_MATERIAL);
  mesh.position.set(HIGHWAY_POSITION_X, HIGHWAY_POSITION_Y, HIGHWAY_POSITION_Z);
  return mesh;
};

export const JUDGE_SCALE_X = HIGHWAY_SCALE_X;
export const JUDGE_SCALE_Y = HIGHWAY_SCALE_Y;
export const JUDGE_SCALE_Z = 0.01;
export const JUDGE_POSITION_X = 0.0;
export const JUDGE_POSITION_Y = 0.003;
export const JUDGE_POSITION_Z = 0.0;
export const JUDGE_GEOMETRY = new three.BoxGeometry(
  JUDGE_SCALE_X,
  JUDGE_SCALE_Y,
  JUDGE_SCALE_Z
);
export const JUDGE_MATERIAL = new three.MeshBasicMaterial({ color: 0xffffff });

export const createJudge = () => {
  const mesh = new three.Mesh(JUDGE_GEOMETRY, JUDGE_MATERIAL);
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
export const RAIL_GEOMETRY = new three.BoxGeometry(
  RAIL_SCALE_X,
  RAIL_SCALE_Y,
  RAIL_SCALE_Z
);
export const RAIL_MATERIAL = new three.MeshBasicMaterial({ color: 0x4a4847 });

export const createRails = ({ renderLeftRail, renderRightRail }) => {
  const mesh = new three.InstancedMesh(RAIL_GEOMETRY, RAIL_MATERIAL, 2);

  if (renderLeftRail) {
    const leftRailMatrix = new three.Matrix4();
    leftRailMatrix.makeRotationFromEuler(
      new three.Euler(0.0, 0.0, -RAIL_ROTATION)
    );
    leftRailMatrix.setPosition(
      new three.Vector3(
        -HIGHWAY_SCALE_X / 2 - RAIL_OFFSET,
        RAIL_OFFSET,
        RAIL_POSITION_Z
      )
    );
    mesh.setMatrixAt(0, leftRailMatrix);
  }

  if (renderRightRail) {
    const rightRailMatrix = new three.Matrix4();
    rightRailMatrix.makeRotationFromEuler(
      new three.Euler(0.0, 0.0, RAIL_ROTATION)
    );
    rightRailMatrix.setPosition(
      new three.Vector3(
        HIGHWAY_SCALE_X / 2 + RAIL_OFFSET,
        RAIL_OFFSET,
        RAIL_POSITION_Z
      )
    );
    mesh.setMatrixAt(1, rightRailMatrix);
  }
  return mesh;
};

export const RAIL_JUDGE_GEOMETRY = new three.BoxGeometry(
  RAIL_SCALE_X,
  JUDGE_SCALE_Y,
  JUDGE_SCALE_Z
);
export const RAIL_JUDGE_MATERIAL = new three.MeshBasicMaterial({
  color: 0xffffff,
});

export const createRailJudge = ({ renderLeftRail, renderRightRail }) => {
  const mesh = new three.InstancedMesh(
    RAIL_JUDGE_GEOMETRY,
    RAIL_JUDGE_MATERIAL,
    2
  );

  if (renderLeftRail) {
    const leftRailJudgeMatrix = new three.Matrix4();
    leftRailJudgeMatrix.makeRotationFromEuler(
      new three.Euler(0.0, 0.0, -RAIL_ROTATION)
    );
    leftRailJudgeMatrix.setPosition(
      new three.Vector3(
        -HIGHWAY_SCALE_X / 2 - RAIL_OFFSET + 0.003,
        RAIL_OFFSET + 0.003,
        JUDGE_POSITION_Z
      )
    );
    mesh.setMatrixAt(0, leftRailJudgeMatrix);
  }

  if (renderRightRail) {
    const rightRailJudgeMatrix = new three.Matrix4();
    rightRailJudgeMatrix.makeRotationFromEuler(
      new three.Euler(0.0, 0.0, RAIL_ROTATION)
    );
    rightRailJudgeMatrix.setPosition(
      new three.Vector3(
        HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.003,
        RAIL_OFFSET + 0.003,
        JUDGE_POSITION_Z
      )
    );
    mesh.setMatrixAt(1, rightRailJudgeMatrix);
  }

  return mesh;
};

export const LANE_DIM_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
export const LANE_DIM_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_DIM_SCALE_Z = HIGHWAY_SCALE_Z;
export const LANE_DIM_POSITION_Y = 0.0003;
export const LANE_DIM_POSITION_Z = HIGHWAY_POSITION_Z;
export const LANE_DIM_SPACE_BETWEEN = HIGHWAY_SCALE_X_PADDING / 5;
export const LANE_DIM_GEOMETRY = new three.BoxGeometry(
  LANE_DIM_SCALE_X,
  LANE_DIM_SCALE_Y,
  LANE_DIM_SCALE_Z
);
export const LANE_DIM_MATERIAL = new three.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.2,
});

export const createLaneDim = (column) => {
  const mesh = new three.Mesh(LANE_DIM_GEOMETRY, LANE_DIM_MATERIAL);
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
export const RAIL_DIM_GEOMETRY = new three.BoxGeometry(
  RAIL_SCALE_X_BASE,
  RAIL_SCALE_Y,
  RAIL_SCALE_Z
);
export const RAIL_DIM_MATERIAL = new three.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.2,
});

export const createRailDim = (column) => {
  const mesh = new three.Mesh(RAIL_DIM_GEOMETRY, RAIL_DIM_MATERIAL);
  mesh.rotation.set(0.0, 0.0, RAIL_ROTATION * column);
  mesh.position.set(
    (HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.0002) * column,
    RAIL_OFFSET + 0.0002,
    RAIL_POSITION_Z
  );
  mesh.visible = false;
  return mesh;
};
