"use strict";

import { Box, Program, Mesh, Mat4, Vec3 } from "ogl";
import { INSTANCED_FRAGMENT, INSTANCED_VERTEX } from "../gl/instanced.js";
import { JUDGEMENT_CONSTANTS } from "../judgement/judgement.js";
import { CHART_LENGTH } from "./halloween0.js";
import {
  HIGHWAY_SCALE_X_BASE,
  HIGHWAY_SCALE_X_PADDING,
  HIGHWAY_SCALE_Y,
  RAIL_SCALE_X_BASE,
  RAIL_SCALE_Y,
} from "./plane.js";

// get rid of the window after judgement
export const PENALTY_WINDOW_AFTER_JUDGEMENT = 0.0;
export const TABLE_DENSITY_PER_SECOND = 10;
export const LANE_NOTE_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
export const LANE_NOTE_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_NOTE_SCALE_Z = 0.2;
export const LANE_NOTE_POSITION_Y = 0.001;
export const LANE_NOTE_POSITION_Z = -4.8;
export const LANE_NOTE_SPACE_BETWEEN = HIGHWAY_SCALE_X_PADDING / 5;
const LANE_NOTE_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: LANE_NOTE_SCALE_X,
    height: LANE_NOTE_SCALE_Y,
    depth: LANE_NOTE_SCALE_Z,
  });
const LANE_NOTE_MATERIAL = ({ gl }) =>
  new Program(gl, {
    uniforms: {
      uTime: { value: 0.0 },
      uR: { value: 0.1843 }, // 0.1843, 0.9686, 0.8392, 1.0
      uG: { value: 0.9686 },
      uB: { value: 0.8392 },
      uA: { value: 1.0 },
    },
    vertex: INSTANCED_VERTEX,
    fragment: INSTANCED_FRAGMENT,
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
      notes[j].timing + JUDGEMENT_CONSTANTS.CONSIDERATION_WINDOW <
        QUANTIZED_TIME
    ) {
      j++;
    }
    var k = j;
    while (
      // we haven't overshot yet
      k < notes.length &&
      notes[k].timing - JUDGEMENT_CONSTANTS.CONSIDERATION_WINDOW <
        QUANTIZED_TIME
    ) {
      const ix = columnToIndex(notes[k].column);
      subInfo[ix] =
        // if we do not have a note yet
        subInfo[ix] === undefined || notes[subInfo[ix]].timing < QUANTIZED_TIME
          ? k
          : subInfo[ix];
      k++;
    }
    //console.log(notes.length,j,k,subInfo, k < notes.length ? notes[k].timing : undefined, QUANTIZED_TIME);
    noteTable.push(subInfo);
  }
  return noteTable;
};

export const createLaneNotes = ({ gl, notes: $notes, groupId }) => {
  const notes = [...$notes];
  const geometry = LANE_NOTE_GEOMETRY({ gl });
  const material = LANE_NOTE_MATERIAL({ gl });
  const laneNoteMesh = new Mesh(gl, { geometry, program: material });

  const laneNoteInfo = [];
  const timing = new Float32Array(notes.length);
  const imx = new Float32Array(notes.length * 16);
  for (var i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteMatrix = new Mat4();
    noteMatrix.setPosition(
      new Vec3(
        (LANE_NOTE_SCALE_X + LANE_NOTE_SPACE_BETWEEN) * note.column,
        LANE_NOTE_POSITION_Y,
        LANE_NOTE_POSITION_Z
      )
    );

    timing[i] = note.timing;
    const nm = noteMatrix.toArray();
    const offset = i * 16;
    for (var j = offset, k = 0; j < offset + 16; j++, k++) {
      imx[offset] = nm[k];
    }
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
  geometry.addAttribute("aTiming", { instanced: 1, size: 1, data: timing });
  geometry.addAttribute("instanceMatrix", { instanced: 1, size: 16, data: imx });
  return { laneNoteMesh, laneNoteInfo, laneNoteTable };
};

export const RAIL_NOTE_SCALE_X = RAIL_SCALE_X_BASE;
export const RAIL_NOTE_SCALE_Y = RAIL_SCALE_Y;
export const RAIL_NOTE_SCALE_Z = LANE_NOTE_SCALE_Z;
export const RAIL_NOTE_POSITION_Z = LANE_NOTE_POSITION_Z;
export const RAIL_NOTE_ROTATION_Z = (45 * Math.PI) / 180;
const RAIL_NOTE_GEOMETRY = ({ gl }) =>
  new Box(gl, {
    width: RAIL_NOTE_SCALE_X,
    height: RAIL_NOTE_SCALE_Y,
    depth: RAIL_NOTE_SCALE_Z,
  });
const RAIL_NOTE_MATERIAL = ({ gl }) =>
  new Program(gl, {
    uniforms: {
      uTime: { value: 0.0 },
      uR: { value: 0.9882 }, // 0.9882, 0.5725, 0.1569
      uG: { value: 0.5725 },
      uB: { value: 0.1569 },
      uA: { value: 1.0 },
    },

    vertex: INSTANCED_VERTEX,
    fragment: INSTANCED_FRAGMENT,
  });
export const RAIL_COLUMN = {
  LEFT: -1,
  RIGHT: 1,
};

const RAIL_NOTE_MATRIX = new Mat4();
RAIL_NOTE_MATRIX.setPosition(0.0001, 0.0001, RAIL_NOTE_POSITION_Z);
export const createRailNotes = ({ gl, notes: $notes, groupId }) => {
  const notes = [...$notes];
  const geometry = RAIL_NOTE_GEOMETRY({ gl });
  const material = RAIL_NOTE_MATERIAL({ gl });
  const railNoteMesh = new Mesh(gl, {
    geometry,
    program: material,
  });
  const imx = new Float32Array(notes.length * 16);
  const railNoteInfo = [];
  const entries = [...notes.entries()];
  const timing = new Float32Array(entries.length);
  for (var i = 0; i < entries.length; i++) {
    const [note] = entries[i];
    timing[i] = note.timing;
    //
    const nm = RAIL_NOTE_MATRIX.toArray();
    const offset = i * 16;
    for (var j = offset, k = 0; j < offset + 16; j++, k++) {
      imx[offset] = nm[k];
    }
    //

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
  geometry.addAttribute("aTiming", { instanced:1, size: 1, data: timing });
  geometry.addAttribute("instanceMatrix", { instanced:1, size: 16, data: imx });
  return { railNoteMesh, railNoteInfo, railNoteTable };
};
