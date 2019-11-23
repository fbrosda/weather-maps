declare let mapboxgl: typeof import("mapbox-gl");

import AbstractGlLayer from "./AbstractGlLayer.js";

export default class TriangleLayer extends AbstractGlLayer {
  aPos: GLint;

  constructor(map: mapboxgl.Map) {
    super("triangle", map);
  }

  async onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const program = await this.loadShaders(gl);

    this.aPos = gl.getAttribLocation(program, "a_pos");

    // define vertices of the triangle to be rendered in the custom style layer
    const helsinki = mapboxgl.MercatorCoordinate.fromLngLat({
      lng: 25.004,
      lat: 60.239
    });
    const berlin = mapboxgl.MercatorCoordinate.fromLngLat({
      lng: 13.403,
      lat: 52.562
    });
    const kyiv = mapboxgl.MercatorCoordinate.fromLngLat({
      lng: 30.498,
      lat: 50.541
    });

    // create and initialize a WebGLBuffer to store vertex and color data
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        helsinki.x,
        helsinki.y,
        berlin.x,
        berlin.y,
        kyiv.x,
        kyiv.y
      ]),
      gl.STATIC_DRAW
    );
  }

  doRender(gl: WebGLRenderingContext, matrix: number[]): void {
    if (!this.program) {
      return;
    }

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(this.program, "u_matrix"),
      false,
      matrix
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
  }
}
