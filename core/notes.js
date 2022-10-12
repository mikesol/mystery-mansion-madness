"use strict";

import * as three from "three";
import {
  HIGHWAY_SCALE_X,
  HIGHWAY_SCALE_X_BASE,
  HIGHWAY_SCALE_X_PADDING,
  HIGHWAY_SCALE_Y,
  RAIL_OFFSET,
  RAIL_SCALE_X,
  RAIL_SCALE_X_BASE,
  RAIL_SCALE_Y,
  SIDES,
} from "./plane.js";

export const GLOBAL_START_OFFSET = 1.5;
export const LANE_NOTE_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
export const LANE_NOTE_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_NOTE_SCALE_Z = 0.2;
export const LANE_NOTE_POSITION_Y = 0.0001;
export const LANE_NOTE_POSITION_Z = -4.8;
export const LANE_NOTE_SPACE_BETWEEN = HIGHWAY_SCALE_X_PADDING / 5;
const LANE_NOTE_GEOMETRY = () =>
  new three.BoxGeometry(
    LANE_NOTE_SCALE_X,
    LANE_NOTE_SCALE_Y,
    LANE_NOTE_SCALE_Z
  );
const LANE_NOTE_MATERIAL = () =>
  new three.RawShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
    },

    vertexShader: `
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform float uTime;

attribute vec3 position;
attribute mat4 instanceMatrix;
attribute float aTiming;

void main()
{
    float myZ = uTime < (aTiming - 1.0) ? 100.0 : uTime > (aTiming + 1.0) ? 100.0 : ((4.8 * (uTime - (aTiming - 1.0))));
    mat4 newMatrix;
    newMatrix[0][0] = 1.0;
    newMatrix[1][1] = 1.0;
    newMatrix[2][2] = 1.0;
    newMatrix[3][3] = 1.0;
    newMatrix[3][2] = myZ;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * newMatrix * vec4(position, 1.0);
}`,

    fragmentShader: `
precision mediump float;

void main()
{
    gl_FragColor = vec4(0.1843, 0.9686, 0.8392, 1.0);
}
`,
  });

export const LANE_COLUMN = {
  FAR_LEFT: -1.5,
  NEAR_LEFT: -0.5,
  NEAR_RIGHT: 0.5,
  FAR_RIGHT: 1.5,
};

export const createLaneNotes = (notes) => {
  const entriesReversed = [...notes].reverse();
  const geometry = LANE_NOTE_GEOMETRY();
  const material = LANE_NOTE_MATERIAL();
  const laneNoteMesh = new three.InstancedMesh(
    geometry,
    material,
    notes.length
  );

  const laneNoteInfo = [];
  const timing = new Float32Array(entriesReversed.length);
  for (var i = 0; i < entriesReversed.length; i++) {

    const note = entriesReversed[i];
    const noteMatrix = new three.Matrix4();
    noteMatrix.setPosition(
      new three.Vector3(
        (LANE_NOTE_SCALE_X + LANE_NOTE_SPACE_BETWEEN) * note.column,
        LANE_NOTE_POSITION_Y,
        LANE_NOTE_POSITION_Z
      )
    );

    timing[i] = note.timing + GLOBAL_START_OFFSET;

    laneNoteMesh.setMatrixAt(i, noteMatrix);
    laneNoteInfo.push({
      timing: note.timing + GLOBAL_START_OFFSET,
      // matrix: noteMatrix,
      hasHit: false,
      // index: index,
      column: note.column,
    });
  }
  geometry.setAttribute(
    "aTiming",
    new three.InstancedBufferAttribute(timing, 1)
  );
  return { laneNoteMesh, laneNoteInfo };
};

export const RAIL_NOTE_SCALE_X = RAIL_SCALE_X_BASE;
export const RAIL_NOTE_SCALE_Y = RAIL_SCALE_Y;
export const RAIL_NOTE_SCALE_Z = LANE_NOTE_SCALE_Z;
export const RAIL_NOTE_POSITION_Z = LANE_NOTE_POSITION_Z;
export const RAIL_NOTE_ROTATION_Z = (45 * Math.PI) / 180;
const RAIL_NOTE_GEOMETRY = () =>
  new three.BoxGeometry(
    RAIL_NOTE_SCALE_X,
    RAIL_NOTE_SCALE_Y,
    RAIL_NOTE_SCALE_Z
  );
const RAIL_NOTE_MATERIAL = () =>
  new three.RawShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
    },

    vertexShader: `
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform float uTime;

attribute vec3 position;
attribute mat4 instanceMatrix;
attribute float aTiming;

void main()
{
    float myZ = uTime < (aTiming - 1.0) ? 100.0 : uTime > (aTiming + 1.0) ? 100.0 : ((4.8 * (uTime - (aTiming - 1.0))));
    mat4 newMatrix;
    newMatrix[0][0] = 1.0;
    newMatrix[1][1] = 1.0;
    newMatrix[2][2] = 1.0;
    newMatrix[3][3] = 1.0;
    newMatrix[3][2] = myZ;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * newMatrix * vec4(position, 1.0);
}`,

    fragmentShader: `
precision mediump float;

void main()
{
    gl_FragColor = vec4(0.9882, 0.5725, 0.1569, 1.0);
}
`,
  });
export const RAIL_COLUMN = {
  LEFT: -1,
  RIGHT: 1,
};

export const createRailNotes = ({
  notes: $notes,
  renderLeftRail,
  renderRightRail,
  side,
}) => {
  const notes = $notes.filter(
    (i) =>
      (i.column == RAIL_COLUMN.LEFT && renderLeftRail) ||
      (i.column == RAIL_COLUMN.RIGHT && renderRightRail)
  );
  const geometry = RAIL_NOTE_GEOMETRY();
  const material = RAIL_NOTE_MATERIAL();
  const railNoteMesh = new three.InstancedMesh(
    geometry,
    material,
    notes.length
  );
  const railNoteInfo = [];
  const entriesReversed = [...notes.reverse().entries()];
  const timing = new Float32Array(entriesReversed.length);
  for (var i = 0; i < entriesReversed.length; i++) {
    const [index, note] = entriesReversed[i];
    const noteMatrix = new three.Matrix4();
    if (side === SIDES.CENTER) { noteMatrix.makeRotationZ(RAIL_NOTE_ROTATION_Z * note.column) };
    noteMatrix.setPosition(
      side === SIDES.CENTER ? (HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.0001) * note.column : (HIGHWAY_SCALE_X / 2 + RAIL_SCALE_X / 2 - 0.0001) * note.column,
      side === SIDES.CENTER ? RAIL_OFFSET + 0.0001 : 0.0001,
      RAIL_NOTE_POSITION_Z
    );
    timing[i] = note.timing + GLOBAL_START_OFFSET;
    railNoteMesh.setMatrixAt(index, noteMatrix);
    railNoteInfo.push({
      timing: note.timing + GLOBAL_START_OFFSET,
      // matrix: noteMatrix,
      hasHit: false,
      // index: index,
      column: note.column,
    });
  }
  geometry.setAttribute(
    "aTiming",
    new three.InstancedBufferAttribute(timing, 1)
  );
  return { railNoteMesh, railNoteInfo };
};
