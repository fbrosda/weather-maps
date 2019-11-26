declare let mapboxgl: typeof import("mapbox-gl");

import AbstractGlLayer from "./AbstractGlLayer.js";
import AbstractCustomLayer from "./AbstractCustomLayer.js";
import ExtProgram from "../util/ExtProgram.js";
import { fetch, ShaderType } from "../util/util.js";

const defaultRampColors = {
  0.0: "#3288bd",
  0.1: "#66c2a5",
  0.2: "#abdda4",
  0.3: "#e6f598",
  0.4: "#fee08b",
  0.5: "#fdae61",
  0.6: "#f46d43",
  1.0: "#d53e4f"
};

class GlLayer extends AbstractGlLayer {
  fadeOpacity = 0.5; // how fast the particle trails fade on each frame
  speedFactor = 0.5; // how fast the particles move
  dropRate = 0.003; // how often the particles move to a random place
  dropRateBump = 0.01; // drop rate increase relative to individual particle speed
  numParticles = 0;
  particleStateResolution = 0;

  drawProgram?: ExtProgram;
  screenProgram?: ExtProgram;
  updateProgram?: ExtProgram;

  quadBuffer?: WebGLBuffer;
  framebuffer?: WebGLBuffer;

  colorRampTexture?: WebGLTexture;
  backgroundTexture?: WebGLTexture;
  screenTexture?: WebGLTexture;
  particleStateTexture0?: WebGLTexture;
  particleStateTexture1?: WebGLTexture;

  particleIndexBuffer?: WebGLBuffer;

  windData?: {
    width: number;
    height: number;
    uMin: number;
    uMax: number;
    vMin: number;
    vMax: number;
  };
  windTexture?: WebGLTexture;

  constructor(shaders: string[], map: mapboxgl.Map, gl: WebGLRenderingContext) {
    super(shaders, map, gl);
    this.init();
  }

  async init(): Promise<void> {
    if (!this.gl) {
      return;
    }
    const gl = this.gl;

    const [drawVert, quadVert, drawFrag, screenFrag, updateFrag] = this.shaders;
    const windDataPromise = this.loadWindData();
    this.setNumParticles(2 ** 16);

    this.drawProgram = this.createProgram(drawVert, drawFrag);
    this.screenProgram = this.createProgram(quadVert, screenFrag);
    this.updateProgram = this.createProgram(quadVert, updateFrag);

    this.quadBuffer = this.createBuffer(
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])
    );
    this.framebuffer = gl.createFramebuffer() ?? undefined;

    const colorRamp = getColorRamp(defaultRampColors);
    if (colorRamp) {
      this.colorRampTexture = this.createTexture(gl.LINEAR, colorRamp, 16, 16);
    }

    const emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
    this.backgroundTexture = this.createTexture(
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height
    );
    this.screenTexture = this.createTexture(
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height
    );

    await windDataPromise;
  }

  prerender(matrix: number[]): void {
    if (this.windTexture) {
      this.bindTexture(this.windTexture, 0);
    }
    if (this.particleStateTexture0) {
      this.bindTexture(this.particleStateTexture0, 1);
    }
    if (this.framebuffer) {
      this.bindFramebuffer(this.framebuffer, this.screenTexture);
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    if (this.backgroundTexture) {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.drawTexture(this.backgroundTexture, this.fadeOpacity);
      this.gl.disable(this.gl.BLEND);
    }
    this.drawParticles(matrix);
  }

  render(): void {
    const gl = this.gl;

    if (this.windTexture) {
      this.bindTexture(this.windTexture, 0);
    }
    if (this.particleStateTexture0) {
      this.bindTexture(this.particleStateTexture0, 1);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this.screenTexture) {
      this.drawTexture(this.screenTexture, 0.8);
    }
    gl.disable(gl.BLEND);

    // save the current screen as the background for the next frame
    const temp = this.backgroundTexture;
    this.backgroundTexture = this.screenTexture;
    this.screenTexture = temp;

    this.updateParticles();
    this.map.resize();
  }

  async loadWindData(): Promise<void> {
    const windJson = await fetch<string>("/data/wind.json");
    this.windData = JSON.parse(windJson);

    const image = document.createElement("img");
    image.src = "/data/wind.png";

    return new Promise(resolve => {
      image.onload = (): void => {
        this.windTexture = this.createTexture(this.gl.LINEAR, image);
        resolve();
      };
    });
  }

  drawTexture(texture: WebGLTexture, opacity: number): void {
    const gl = this.gl;
    if (this.screenProgram) {
      const prog = this.screenProgram;
      gl.useProgram(prog.getProgram());
      const aPos = prog.getAttribute("a_pos");

      if (this.quadBuffer) {
        this.bindAttribute(this.quadBuffer, aPos, 2);
      }
      this.bindTexture(texture, 2);
      gl.uniform1i(prog.getUniform("u_screen"), 2);
      gl.uniform1f(prog.getUniform("u_opacity"), opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  drawParticles(matrix: number[]): void {
    const gl = this.gl;

    if (this.drawProgram) {
      const prog = this.drawProgram;
      gl.useProgram(prog.getProgram());
      const aIndex = prog.getAttribute("a_index");

      if (this.particleIndexBuffer) {
        this.bindAttribute(this.particleIndexBuffer, aIndex, 1);
      }
      if (this.colorRampTexture) {
        this.bindTexture(this.colorRampTexture, 2);
      }

      gl.uniform1i(prog.getUniform("u_wind"), 0);
      gl.uniform1i(prog.getUniform("u_particles"), 1);
      gl.uniform1i(prog.getUniform("u_color_ramp"), 2);
      gl.uniformMatrix4fv(prog.getUniform("u_matrix"), false, matrix);

      gl.uniform1f(
        prog.getUniform("u_particles_res"),
        this.particleStateResolution
      );
      gl.uniform2f(
        prog.getUniform("u_wind_min"),
        this.windData?.uMin ?? 0,
        this.windData?.vMin ?? 0
      );
      gl.uniform2f(
        prog.getUniform("u_wind_max"),
        this.windData?.uMax ?? 0,
        this.windData?.vMax ?? 0
      );

      gl.drawArrays(gl.POINTS, 0, this.numParticles);
    }
  }

  updateParticles(): void {
    const gl = this.gl;

    if (this.framebuffer && this.particleStateTexture1) {
      this.bindFramebuffer(this.framebuffer, this.particleStateTexture1);
      gl.viewport(
        0,
        0,
        this.particleStateResolution,
        this.particleStateResolution
      );
    }

    if (this.updateProgram) {
      const prog = this.updateProgram;
      gl.useProgram(prog.getProgram());
      const aPos = prog.getAttribute("a_pos");

      if (this.quadBuffer) {
        this.bindAttribute(this.quadBuffer, aPos, 2);
      }

      gl.uniform1i(prog.getUniform("u_wind"), 0);
      gl.uniform1i(prog.getUniform("u_particles"), 1);

      gl.uniform1f(prog.getUniform("u_rand_seed"), Math.random());
      gl.uniform2f(
        prog.getUniform("u_wind_res"),
        this.windData?.width ?? 0,
        this.windData?.height ?? 0
      );
      gl.uniform2f(
        prog.getUniform("u_wind_min"),
        this.windData?.uMin ?? 0,
        this.windData?.vMin ?? 0
      );
      gl.uniform2f(
        prog.getUniform("u_wind_max"),
        this.windData?.uMax ?? 0,
        this.windData?.vMax ?? 0
      );
      gl.uniform1f(prog.getUniform("u_speed_factor"), this.speedFactor);
      gl.uniform1f(prog.getUniform("u_drop_rate"), this.dropRate);
      gl.uniform1f(prog.getUniform("u_drop_rate_bump"), this.dropRateBump);

      const bounds = this.map.getBounds();
      const nw = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getNorthWest());
      const se = mapboxgl.MercatorCoordinate.fromLngLat(bounds.getSouthEast());
      gl.uniform2f(
        prog.getUniform("u_nw"),
        Math.min(1, Math.max(nw.x, 0)),
        Math.min(1, Math.max(nw.y, 0))
      );
      gl.uniform2f(
        prog.getUniform("u_se"),
        Math.min(1, Math.max(se.x, 0)),
        Math.min(1, Math.max(se.y, 0))
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // swap the particle state textures so the new one becomes the current one
      const temp = this.particleStateTexture0;
      this.particleStateTexture0 = this.particleStateTexture1;
      this.particleStateTexture1 = temp;
    }
  }

  setNumParticles(numParticles: number): void {
    const gl = this.gl;
    // we create a square texture where each pixel will hold a particle position encoded as RGBA
    const particleRes = (this.particleStateResolution = Math.ceil(
      Math.sqrt(numParticles)
    ));
    this.numParticles = particleRes * particleRes;

    const particleState = new Uint8Array(this.numParticles * 4);
    for (let i = 0; i < particleState.length; i++) {
      particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
    }
    // textures to hold the particle state for the current and the next frame
    this.particleStateTexture0 = this.createTexture(
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes
    );
    this.particleStateTexture1 = this.createTexture(
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes
    );

    const particleIndices = new Float32Array(this.numParticles);
    for (let i = 0; i < this.numParticles; i++) {
      particleIndices[i] = i;
    }
    this.particleIndexBuffer = this.createBuffer(particleIndices);
  }

  getNumParticles(): number {
    return this.numParticles;
  }
}

function getColorRamp(colors: any): Uint8Array | undefined {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (ctx) {
    canvas.width = 256;
    canvas.height = 1;

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    for (const stop in colors) {
      gradient.addColorStop(+stop, colors[stop]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
  }

  return;
}

export default class TriangleLayer extends AbstractCustomLayer {
  shaders: Promise<string[]>;

  constructor(map?: mapboxgl.Map) {
    super("wind", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX, "draw"),
      this.loadShaderSource(ShaderType.VERTEX, "quad"),
      this.loadShaderSource(ShaderType.FRAGMENT, "draw"),
      this.loadShaderSource(ShaderType.FRAGMENT, "screen"),
      this.loadShaderSource(ShaderType.FRAGMENT, "update")
    ]);
  }

  async onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const shaders = await this.shaders;
    this.layer = new GlLayer(shaders, map, gl);
  }
}
