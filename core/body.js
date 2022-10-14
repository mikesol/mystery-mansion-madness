"use strict";

import * as three from "three";

export const HEAVENLY_BODY_GEOMETRY = new three.SphereGeometry(1.0);
export const HEAVENLY_BODY_MATERIAL = new three.MeshLambertMaterial();

export const createHeavenlyBodies = (noteInfos) => {
    const mesh = new three.InstancedMesh(HEAVENLY_BODY_GEOMETRY, HEAVENLY_BODY_MATERIAL, noteInfos.length);
    const notes = [];
    for (const [index, noteInfo] of noteInfos.reverse().entries()) {
        const matrix = new three.Matrix4();
        matrix.setPosition(noteInfo.x, noteInfo.y, noteInfo.z);
        mesh.setMatrixAt(index, matrix);
        notes.push({
            timing: noteInfo.timing,
            matrix,
            index,
        });
    }
    return { mesh, notes };
};
