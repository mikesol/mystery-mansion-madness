export const BASIC_VERTEX = /* glsl */  `
attribute vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const BASIC_FRAGMENT = /* glsl */  `
precision mediump float;
uniform float uR;
uniform float uG;
uniform float uB;
uniform float uA;
void main() {
    gl_FragColor = vec4(uR, uG, uB, uA);
}
`;
