export const INSTANCED_VERTEX = /* glsl */  `
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
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
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * newMatrix * vec4(position, 1.0);
}
`;

export const INSTANCED_FRAGMENT = /* glsl */  `
precision mediump float;
uniform float uR;
uniform float uG;
uniform float uB;
uniform float uA;
void main()
{
    gl_FragColor = vec4(uR, uG, uB, uA);
}
`;
