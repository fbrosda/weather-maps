declare let maplibregl: typeof import("maplibre-gl");

import AbstractGlLayer from "./AbstractGlLayer.js";
import AbstractCustomLayer from "./AbstractCustomLayer.js";
import ExtProgram from "../util/ExtProgram.js";
import { ShaderType } from "../util/util.js";

class GlLayer extends AbstractGlLayer {
  program?: ExtProgram;
  buffer?: WebGLBuffer | null;

  constructor(shaders: string[], map: maplibregl.Map, gl: WebGLRenderingContext) {
    super(shaders, map, gl);
    this.init();
  }

  init(): void {
    const [vertShader, fragShader] = this.shaders;
    this.program = this.createProgram(vertShader, fragShader);

    const helsinki = this.createPoint(25.004, 60.239);
    const berlin = this.createPoint(13.403, 52.562);
    const kyiv = this.createPoint(30.498, 50.541);
    this.buffer = this.createBuffer(
      new Float32Array([
        helsinki.x,
        helsinki.y,
        berlin.x,
        berlin.y,
        kyiv.x,
        kyiv.y,
      ])
    );
  }

  render(matrix: number[]): void {
    if (!this.program) {
      return;
    }
    const uMatrix = this.program.getUniform("u_matrix");

    this.gl.useProgram(this.program.getProgram());
    this.gl.uniformMatrix4fv(uMatrix, false, matrix);

    if (this.buffer) {
      const aPos = this.program.getAttribute("a_pos");
      this.bindAttribute(this.buffer, aPos, 2);

      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 3);
    }
  }

  private createPoint(lng: number, lat: number): maplibregl.MercatorCoordinate {
    return maplibregl.MercatorCoordinate.fromLngLat({
      lng: lng,
      lat: lat,
    });
  }
}

export default class TriangleLayer extends AbstractCustomLayer {
  shaders: Promise<string[]>;

  constructor(map?: maplibregl.Map) {
    super("triangle", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX),
      this.loadShaderSource(ShaderType.FRAGMENT),
    ]);
  }

  async onAdd(map: maplibregl.Map, gl: WebGLRenderingContext): Promise<void> {
    const shaders = await this.shaders;
    this.layer = new GlLayer(shaders, map, gl);
  }
}
