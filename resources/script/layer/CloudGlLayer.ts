// declare let mapboxgl: typeof import("mapbox-gl");

import AbstractGlLayer from "./AbstractGlLayer.js";
import ExtProgram from "../util/ExtProgram.js";
import { loadImage, fetch } from "../util/util.js";

type CloudInfo = {
  width: number;
  height: number;
  cMin: number;
  cMax: number;
  pMin: number;
  pMax: number;
  sMin: number;
  sMax: number;
};

export default class GlLayer extends AbstractGlLayer {
  program?: ExtProgram;

  quadBuffer?: WebGLBuffer;

  cloudData: CloudInfo[] = [];
  cloudTexture: WebGLTexture[] = [];
  cloudMix = 0;

  constructor(shaders: string[], map: mapboxgl.Map, gl: WebGLRenderingContext) {
    super(shaders, map, gl);
    this.init();
  }

  async init(): Promise<void> {
    // const gl = this.gl;
    const [vert, frag] = this.shaders;

    this.program = this.createProgram(vert, frag);

    this.quadBuffer = this.createBuffer(
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])
    );

    // this.clear();
  }

  render(matrix: number[]): void {
    if (!this.cloudData.length) {
      return;
    }
    const gl = this.gl;

    if (this.cloudTexture[0]) {
      this.bindTexture(this.cloudTexture[0], 0);
    }

    if (this.program) {
      const prog = this.program;
      gl.useProgram(prog.getProgram());

      const aPos = prog.getAttribute("a_pos");
      const uMatrix = prog.getUniform("u_matrix");
      const uCloud = prog.getUniform("u_cloud");

      if (this.quadBuffer) {
        this.bindAttribute(this.quadBuffer, aPos, 2);
      }
      gl.uniformMatrix4fv(uMatrix, false, matrix);
      gl.uniform1i(uCloud, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  async loadCloudData(forecast = "1", resolution = "high"): Promise<void> {
    const args = `?resolution=${resolution}&forecast=${forecast}`;
    const [json, img] = await Promise.all([
      fetch<string>(`/data/cloud.json${args}`),
      loadImage(`/data/cloud.png${args}`)
    ]);
    this.cloudData = rotate(this.cloudData, JSON.parse(json));
    this.cloudTexture = rotate(
      this.cloudTexture,
      this.createTexture(this.gl.LINEAR, img)
    );
    // this.cloudMix = 1;

    function rotate<T>(arr: T[], data: T): T[] {
      if (!arr.length) {
        return [data, data];
      } else {
        arr.unshift(data);
        return arr.slice(0, 2);
      }
    }
  }
}
