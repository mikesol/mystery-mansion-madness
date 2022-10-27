export const IMAGE_VERTEX = /* glsl */  `
attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const IMAGE_ALPHA = /* glsl */  `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform sampler2D uAlpha;
void main() {
    vec4 alphaMapColor = texture2D(uAlpha, vUv);
    if (alphaMapColor.r < 0.99) discard;
    vec4 textureColor = texture2D(uTexture, vUv);
    gl_FragColor = textureColor;
}
`;