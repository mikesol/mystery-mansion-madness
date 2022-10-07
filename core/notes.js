"use strict";

import * as three from "three";
import { HIGHWAY_SCALE_X, HIGHWAY_SCALE_X_BASE, HIGHWAY_SCALE_X_PADDING, HIGHWAY_SCALE_Y, RAIL_OFFSET, RAIL_SCALE_X_BASE, RAIL_SCALE_Y } from "./plane.js";

export const LANE_NOTE_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
export const LANE_NOTE_SCALE_Y = HIGHWAY_SCALE_Y;
export const LANE_NOTE_SCALE_Z = 0.20;
export const LANE_NOTE_POSITION_Y = 0.0001;
export const LANE_NOTE_POSITION_Z = -4.8;
export const LANE_NOTE_SPACE_BETWEEN = HIGHWAY_SCALE_X_PADDING / 5;
export const LANE_NOTE_GEOMETRY = new three.BoxGeometry(LANE_NOTE_SCALE_X, LANE_NOTE_SCALE_Y, LANE_NOTE_SCALE_Z);
export const LANE_NOTE_MATERIAL = new three.MeshBasicMaterial({ color: 0x2ff7d6 });
export const LANE_COLUMN = {
    FAR_LEFT: -1.5,
    NEAR_LEFT: -0.5,
    NEAR_RIGHT: 0.5,
    FAR_RIGHT: 1.5,
};

export const createLaneNotes = (notes) => {
    const laneNoteMesh = new three.InstancedMesh(LANE_NOTE_GEOMETRY, LANE_NOTE_MATERIAL, notes.length);
    const laneNoteInfo = {};
    for (const [index, note] of notes.reverse().entries()) {
        const noteMatrix = new three.Matrix4();
        noteMatrix.setPosition(new three.Vector3(
            (LANE_NOTE_SCALE_X + LANE_NOTE_SPACE_BETWEEN) * note.column,
            LANE_NOTE_POSITION_Y,
            LANE_NOTE_POSITION_Z,
        ));
        laneNoteMesh.setMatrixAt(index, noteMatrix);
        if (laneNoteInfo[note.column] === undefined) {
            laneNoteInfo[note.column] = [];
        }
        laneNoteInfo[note.column].push({
            timing: note.timing,
            matrix: noteMatrix,
            hasHit: false,
            index: index,
        });
    }
    return { laneNoteMesh, laneNoteInfo }
}

export const RAIL_NOTE_SCALE_X = RAIL_SCALE_X_BASE;
export const RAIL_NOTE_SCALE_Y = RAIL_SCALE_Y;
export const RAIL_NOTE_SCALE_Z = LANE_NOTE_SCALE_Z;
export const RAIL_NOTE_POSITION_Z = LANE_NOTE_POSITION_Z;
export const RAIL_NOTE_ROTATION_Z = 45 * Math.PI / 180;
export const RAIL_NOTE_GEOMETRY = new three.BoxGeometry(RAIL_NOTE_SCALE_X, RAIL_NOTE_SCALE_Y, RAIL_NOTE_SCALE_Z);
export const RAIL_NOTE_MATERIAL = new three.MeshBasicMaterial({ color: 0xfc9228 });
export const RAIL_COLUMN = {
    LEFT: -1,
    RIGHT: 1,
};

export const createRailNotes = (notes) => {
    const railNoteMesh = new three.InstancedMesh(RAIL_NOTE_GEOMETRY, RAIL_NOTE_MATERIAL, notes.length);
    const railNoteInfo = {};
    for (const [index, note] of notes.reverse().entries()) {
        const noteMatrix = new three.Matrix4();
        noteMatrix.makeRotationZ(RAIL_NOTE_ROTATION_Z * note.column);
        noteMatrix.setPosition(
            (HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.0001) * note.column,
            RAIL_OFFSET + 0.0001,
            RAIL_NOTE_POSITION_Z,
        );
        railNoteMesh.setMatrixAt(index, noteMatrix);
        if (railNoteInfo[note.column] === undefined) {
            railNoteInfo[note.column] = [];
        }
        railNoteInfo[note.column].push({
            timing: note.timing,
            matrix: noteMatrix,
            hasHit: false,
            index: index,
        });
    }
    return { railNoteMesh, railNoteInfo };
}
