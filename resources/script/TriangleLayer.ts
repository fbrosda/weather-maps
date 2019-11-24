declare let mapboxgl: typeof import("mapbox-gl");

import AbstractGlLayer from "./AbstractGlLayer.js";

export default class TriangleLayer extends AbstractGlLayer {
  buffer?: WebGLBuffer | null;

  constructor(map: mapboxgl.Map) {
    super("triangle", map);
  }

  async onAdd(_: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const arr = await Promise.all([
      this.loadShaderSource(gl, null, gl.VERTEX_SHADER),
      this.loadShaderSource(gl, null, gl.FRAGMENT_SHADER)
    ]);
    this.program = this.createProgram(gl, arr[0], arr[1]);

    this.buffer = gl.createBuffer();
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
    if (this.buffer) {
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
  }

  doRender(gl: WebGLRenderingContext, matrix: number[]): void {
    if (!this.program) {
      return;
    }
    const aPos = this.attributeMap.get("a_pos") ?? -1;
    const uMatrix = this.uniformMap.get("u_matrix") ?? -1;

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(uMatrix, false, matrix);

    if (this.buffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
    }
  }
}
