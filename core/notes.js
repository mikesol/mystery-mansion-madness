"use strict";

import * as three from "three";
import { CHART_LENGTH } from "./halloween0.js";
import {
  HIGHWAY_SCALE_X_BASE,
  HIGHWAY_SCALE_X_PADDING,
  HIGHWAY_SCALE_Y,
  RAIL_SCALE_X_BASE,
  RAIL_SCALE_Y,
} from "./plane.js";

export const UNREACHABLE_POINT = 0.5;
export const PENALTY_WINDOW_AFTER_JUDGEMENT = 0.15;
export const TABLE_DENSITY_PER_SECOND = 10;
export const LANE_NOTE_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
export const LANE_NOTE_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_NOTE_SCALE_Z = 0.2;
export const LANE_NOTE_POSITION_Y = 0.001;
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

const fillTable = ({ notes, columnToIndex, arrSize }) => {
  const noteTable = [];
  for (var i = 0, j = 0; i < CHART_LENGTH * TABLE_DENSITY_PER_SECOND; i++) {
    const subInfo = new Array(arrSize);
    const QUANTIZED_TIME = i / TABLE_DENSITY_PER_SECOND;
    while (
      // we still have notes
      j < notes.length &&
      // the note has passed, meaning
      // that its time plus an unreachable margin is still less than quantized time
      // for example, if the note's timing is 15.4 then it should linger until 15.9
      // if quantized time is 0.0, we don't shift, but as soon as it is 16.0 we do
      notes[j].timing + UNREACHABLE_POINT < QUANTIZED_TIME
    ) {
      j++;
    }
    var k = j;
    while (
      // we haven't overshot yet
      k < notes.length &&
      // slightly earlier than when the note comes is now less than quantized time
      // for example, if the timing is 15.4 then we should start listening at 14.9
      // that means that we will do nothing when quantized time is 0.0
      // but we will do something when it's 15.3
      notes[k].timing - UNREACHABLE_POINT < QUANTIZED_TIME
    ) {
      const ix = columnToIndex(notes[k].column);
      subInfo[ix] =
        // if we do not have a note yet
        subInfo[ix] === undefined ||
        // the note plus the short penalty window has exceeded the current time
        notes[subInfo[ix]].timing + PENALTY_WINDOW_AFTER_JUDGEMENT >
          QUANTIZED_TIME
          ? k
          : subInfo[ix];
      k++;
    }
    //console.log(notes.length,j,k,subInfo, k < notes.length ? notes[k].timing : undefined, QUANTIZED_TIME);
    noteTable.push(subInfo);
  }
  return noteTable;
};

export const createLaneNotes = ({ notes: $notes, groupId }) => {
  const notes = [...$notes];
  const geometry = LANE_NOTE_GEOMETRY();
  const material = LANE_NOTE_MATERIAL();
  const laneNoteMesh = new three.InstancedMesh(
    geometry,
    material,
    notes.length
  );

  const laneNoteInfo = [];
  const timing = new Float32Array(notes.length);
  for (var i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteMatrix = new three.Matrix4();
    noteMatrix.setPosition(
      new three.Vector3(
        (LANE_NOTE_SCALE_X + LANE_NOTE_SPACE_BETWEEN) * note.column,
        LANE_NOTE_POSITION_Y,
        LANE_NOTE_POSITION_Z
      )
    );

    timing[i] = note.timing;
    laneNoteMesh.setMatrixAt(i, noteMatrix);
    laneNoteInfo.push({
      timing: note.timing,
      groupId,
      noteId: i,
      hasHit: false,
      column: note.column,
    });
  }
  const laneNoteTable = fillTable({
    notes,
    arrSize: 4,
    columnToIndex: (c) =>
      c === LANE_COLUMN.FAR_LEFT
        ? 0
        : c === LANE_COLUMN.NEAR_LEFT
        ? 1
        : c === LANE_COLUMN.NEAR_RIGHT
        ? 2
        : 3,
  });

  /**
   * ;
   */
  geometry.setAttribute(
    "aTiming",
    new three.InstancedBufferAttribute(timing, 1)
  );
  return { laneNoteMesh, laneNoteInfo, laneNoteTable };
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

const RAIL_NOTE_MATRIX = new three.Matrix4();
RAIL_NOTE_MATRIX.setPosition(
  0.0001,
  0.0001,
  RAIL_NOTE_POSITION_Z
);
export const createRailNotes = ({ notes: $notes, groupId }) => {
  const notes = [...$notes];
  const geometry = RAIL_NOTE_GEOMETRY();
  const material = RAIL_NOTE_MATERIAL();
  const railNoteMesh = new three.InstancedMesh(
    geometry,
    material,
    notes.length
  );
  const railNoteInfo = [];
  const entries = [...notes.entries()];
  const timing = new Float32Array(entries.length);
  for (var i = 0; i < entries.length; i++) {
    const [index, note] = entries[i];
    timing[i] = note.timing;
    railNoteMesh.setMatrixAt(index, RAIL_NOTE_MATRIX);
    railNoteInfo.push({
      timing: note.timing,
      hasHit: false,
      noteId: i,
      groupId,
      column: note.column,
    });
  }
  const railNoteTable = fillTable({
    notes,
    arrSize: 1,
    columnToIndex: () => 0,
  });
  geometry.setAttribute(
    "aTiming",
    new three.InstancedBufferAttribute(timing, 1)
  );
  return { railNoteMesh, railNoteInfo, railNoteTable };
};
