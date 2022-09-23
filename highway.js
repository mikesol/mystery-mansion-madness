"use strict";

import * as three from "three";

const NOTE_SPACE_BETWEEN = HIGHWAY_SCALE_X_PADDING / 5;
const NOTE_POSITION_Z = -4.8;
const NOTE_SCALE_X = HIGHWAY_SCALE_X_BASE / 4;
const NOTE_SCALE_Y = HIGHWAY_SCALE_Y;
const NOTE_SCALE_Z = 0.15;

const createDim = (positionX) => {
    const geometry = new three.BoxGeometry(NOTE_SCALE_X, HIGHWAY_SCALE_Y, HIGHWAY_SCALE_Z);
    const material = new three.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.2 });
    const mesh = new three.Mesh(geometry, material);
    mesh.position.set(positionX, HIGHWAY_POSITION_Y + 0.002, HIGHWAY_POSITION_Z);
    mesh.visible = false;
    return mesh;
}

export const createDims = () => {
    return [
        createDim(-(NOTE_SCALE_X + NOTE_SPACE_BETWEEN) * 1.5),
        createDim(-(NOTE_SCALE_X + NOTE_SPACE_BETWEEN) * 0.5),
        createDim((NOTE_SCALE_X + NOTE_SPACE_BETWEEN) * 0.5),
        createDim((NOTE_SCALE_X + NOTE_SPACE_BETWEEN) * 1.5),
    ];
}

export const createRailDims = () => {
    const geometry = new three.BoxGeometry(RAIL_SCALE_X_BASE, RAIL_SCALE_Y, RAIL_SCALE_Z);
    const material = new three.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.2 });
    const leftMesh = new three.Mesh(geometry, material);
    const rightMesh = new three.Mesh(geometry, material);

    leftMesh.rotation.set(0.0, 0.0, -RAIL_ROTATION);
    leftMesh.position.set(-HIGHWAY_SCALE_X / 2 - RAIL_OFFSET + 0.002, RAIL_OFFSET + 0.0002, RAIL_POSITION_Z);

    rightMesh.rotation.set(0.0, 0.0, RAIL_ROTATION);
    rightMesh.position.set(HIGHWAY_SCALE_X / 2 + RAIL_OFFSET - 0.002, RAIL_OFFSET + 0.0002, RAIL_POSITION_Z);

    leftMesh.visible = false;
    rightMesh.visible = false;

    return [leftMesh, rightMesh];
}
