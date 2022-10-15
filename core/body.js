"use strict";

import * as three from "three";

export const HEAVENLY_BODY_GEOMETRY = new three.SphereGeometry(1.0);
export const HEAVENLY_BODY_MATERIAL = new three.MeshLambertMaterial({ color: 0xFFFFFF });

export const createHeavenlyBodies = (noteInfos) => {
    const white = new three.Color().setHex(0xFFFFFF);
    const mesh = new three.InstancedMesh(HEAVENLY_BODY_GEOMETRY, HEAVENLY_BODY_MATERIAL, noteInfos.length);
    const notes = [];
    for (const [index, noteInfo] of noteInfos.reverse().entries()) {
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
