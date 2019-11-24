declare let mapboxgl: typeof import("mapbox-gl");

import { AbstractGlLayer, ExtProgram } from "./AbstractGlLayer.js";

export default class TriangleLayer extends AbstractGlLayer {
  program?: ExtProgram;
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
    this.buffer = this.createBuffer(
      gl,
      new Float32Array([
        helsinki.x,
        helsinki.y,
        berlin.x,
        berlin.y,
        kyiv.x,
        kyiv.y
      ])
    );
  }

  doRender(gl: WebGLRenderingContext, matrix: number[]): void {
    if (!this.program) {
      return;
    }
    const uMatrix = this.program.uniformMap.get("u_matrix") ?? -1;

    gl.useProgram(this.program.program);
    gl.uniformMatrix4fv(uMatrix, false, matrix);

    if (this.buffer) {
      const aPos = this.program.attributeMap.get( "a_pos" );
      if( aPos ) {
        this.bindAttribute(gl, this.buffer, aPos, 2);
      }

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 3);
    }
  }
}
