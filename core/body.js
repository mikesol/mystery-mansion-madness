"use strict";

import * as three from "three";

export const HEAVENLY_BODY_GEOMETRY = new three.SphereGeometry(1.0);
export const HEAVENLY_BODY_MATERIAL = new three.MeshLambertMaterial({ color: 0xFFFFFF });

export const createHeavenlyBodies = (noteInfos) => {
    const white = new three.Color().setHex(0xFFFFFF);
    const mesh = new three.InstancedMesh(HEAVENLY_BODY_GEOMETRY, HEAVENLY_BODY_MATERIAL, noteInfos.length);
    const notes = [];
    for (const [index, noteInfo] of noteInfos.slice().reverse().entries()) {
        const matrix = new three.Matrix4();
        matrix.setPosition(noteInfo.initialX, noteInfo.initialY, noteInfo.initialZ);
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, white);
        notes.push({
            timing: noteInfo.timing,
            initialX: noteInfo.initialX,
            initialY: noteInfo.initialY,
            initialZ: noteInfo.initialZ,
            targetX: noteInfo.targetX,
            targetY: noteInfo.targetY,
            targetZ: noteInfo.targetZ,
            matrix,
            index,
        });
    }
    return { mesh, notes };
};

export const HIGHLIGHT_GEOMETRY = new three.TorusGeometry(1.50, 0.20, 10, 100);
export const HIGHLIGHT_MATERIAL = new three.MeshLambertMaterial( { color: 0xffff00 } );

export const createHighlights = (noteInfos) => {
    const yellow = new three.Color().setHex(0xFFFF00);
    const mesh = new three.InstancedMesh(HIGHLIGHT_GEOMETRY, HIGHLIGHT_MATERIAL, noteInfos.length);
    const notes = [];
    for (const [index, noteInfo] of noteInfos.slice().reverse().entries()) {
        const matrix = new three.Matrix4();
        matrix.setPosition(0.0, 0.0, 20.0);
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, yellow);
        notes.push({
            timing: noteInfo.timing,
            initialX: noteInfo.initialX,
            initialY: noteInfo.initialY,
            initialZ: noteInfo.initialZ,
            targetX: noteInfo.targetX,
            targetY: noteInfo.targetY,
            targetZ: noteInfo.targetZ,
            matrix,
            index,
        });
    }
    return { mesh, notes };
}
