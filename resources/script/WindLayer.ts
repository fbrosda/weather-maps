// declare let mapboxgl: typeof import("mapbox-gl");

import { AbstractGlLayer, ExtProgram } from "./AbstractGlLayer.js";
import { fetch } from "./util.js";

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

export default class WindLayer extends AbstractGlLayer {
  fadeOpacity: number; // how fast the particle trails fade on each frame
  speedFactor: number; // how fast the particles move
  dropRate: number; // how often the particles move to a random place
  dropRateBump: number; // drop rate increase relative to individual particle speed

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

  numParticles: number;
  particleStateResolution: number;

  windData?: {
    width: number;
    height: number;
    uMin: number;
    uMax: number;
    vMin: number;
    vMax: number;
  };
  windTexture?: WebGLTexture;

  constructor(map: mapboxgl.Map) {
    super("wind", map);

    this.fadeOpacity = 0.996;
    this.speedFactor = 0.25;
    this.dropRate = 0.003;
    this.dropRateBump = 0.01;
    this.numParticles = 0;
    this.particleStateResolution = 0;
  }

  async onAdd(_: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const [
      drawVert,
      quadVert,
      drawFrag,
      screenFrag,
      updateFrag
    ] = await Promise.all([
      this.loadShaderSource(gl, "wind_draw", gl.VERTEX_SHADER),
      this.loadShaderSource(gl, "wind_quad", gl.VERTEX_SHADER),
      this.loadShaderSource(gl, "wind_draw", gl.FRAGMENT_SHADER),
      this.loadShaderSource(gl, "wind_screen", gl.FRAGMENT_SHADER),
      this.loadShaderSource(gl, "wind_update", gl.FRAGMENT_SHADER)
    ]);
    const windDataPromise = this.loadWindData(gl);
    this.setNumParticles(gl, 65356);

    this.drawProgram = this.createProgram(gl, drawVert, drawFrag);
    this.screenProgram = this.createProgram(gl, quadVert, screenFrag);
    this.updateProgram = this.createProgram(gl, quadVert, updateFrag);

    this.quadBuffer = this.createBuffer(
      gl,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])
    );
    this.framebuffer = gl.createFramebuffer() ?? undefined;

    const colorRamp = getColorRamp(defaultRampColors);
    if (colorRamp) {
      this.colorRampTexture = this.createTexture(
        gl,
        gl.LINEAR,
        colorRamp,
        16,
        16
      );
    }

    const emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
    this.backgroundTexture = this.createTexture(
      gl,
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height
    );
    this.screenTexture = this.createTexture(
      gl,
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height
    );

    await windDataPromise;
  }

  prerender(gl: WebGLRenderingContext /*, matrix: number[]*/): void {
    if (this.windTexture) {
      this.bindTexture(gl, this.windTexture, 0);
    }
    if (this.particleStateTexture0) {
      this.bindTexture(gl, this.particleStateTexture0, 1);
    }
    if (this.framebuffer) {
      this.bindFramebuffer(gl, this.framebuffer, this.screenTexture);
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (this.backgroundTexture) {
      this.drawTexture(gl, this.backgroundTexture, this.fadeOpacity);
    }
    this.drawParticles(gl);
  }

  doRender(gl: WebGLRenderingContext /*, matrix: number[]*/): void {
    if (this.windTexture) {
      // console.log(matrix);
      // gl.disable(gl.DEPTH_TEST);
      // gl.disable(gl.STENCIL_TEST);

      if (this.windTexture) {
        this.bindTexture(gl, this.windTexture, 0);
      }
      if (this.particleStateTexture0) {
        this.bindTexture(gl, this.particleStateTexture0, 1);
      }

      this.drawScreen(gl);

      this.updateParticles(gl);
      this.map.resize();
    }
  }

  setNumParticles(gl: WebGLRenderingContext, numParticles: number): void {
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
      gl,
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes
    );
    this.particleStateTexture1 = this.createTexture(
      gl,
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes
    );

    const particleIndices = new Float32Array(this.numParticles);
    for (let i = 0; i < this.numParticles; i++) {
      particleIndices[i] = i;
    }
    this.particleIndexBuffer = this.createBuffer(gl, particleIndices);
  }

  getNumParticles(): number {
    return this.numParticles;
  }

  async loadWindData(gl: WebGLRenderingContext): Promise<void> {
    const windJson = await fetch<string>("/data/wind.json");
    this.windData = JSON.parse(windJson);

    const image = document.createElement("img");
    image.src = "/data/wind.png";

    return new Promise(resolve => {
      image.onload = () => {
        this.windTexture = this.createTexture(gl, gl.LINEAR, image);
        resolve();
      };
    });
  }

  drawScreen(gl: WebGLRenderingContext) {
    // draw the screen into a temporary framebuffer to retain it as the background on the next frame
    // if (this.framebuffer) {
    //   this.bindFramebuffer(gl, this.framebuffer, this.screenTexture);
    // }
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // if (this.backgroundTexture) {
    //   this.drawTexture(gl, this.backgroundTexture, this.fadeOpacity);
    // }
    // this.drawParticles(gl);

    // this.bindFramebuffer(gl, null);
    // enable blending to support drawing on top of an existing background (e.g. a map)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (this.screenTexture) {
      this.drawTexture(gl, this.screenTexture, 1.0);
    }
    gl.disable(gl.BLEND);

    // save the current screen as the background for the next frame
    const temp = this.backgroundTexture;
    this.backgroundTexture = this.screenTexture;
    this.screenTexture = temp;
  }

  drawTexture(
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    opacity: number
  ) {
    if (this.screenProgram) {
      gl.useProgram(this.screenProgram.program);
      const uniMap = this.screenProgram.uniformMap;
      const aPos = this.screenProgram.attributeMap.get("a_pos") ?? -1;

      if (this.quadBuffer) {
        this.bindAttribute(gl, this.quadBuffer, aPos, 2);
      }
      this.bindTexture(gl, texture, 2);
      gl.uniform1i(uniMap.get("u_screen") || null, 2);
      gl.uniform1f(uniMap.get("u_opacity") || null, opacity);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  drawParticles(gl: WebGLRenderingContext) {
    if (this.drawProgram) {
      gl.useProgram(this.drawProgram.program);
      const uniMap = this.drawProgram.uniformMap;
      const aIndex = this.drawProgram.attributeMap.get("a_index") ?? -1;

      if (this.particleIndexBuffer) {
        this.bindAttribute(gl, this.particleIndexBuffer, aIndex, 1);
      }
      if (this.colorRampTexture) {
        this.bindTexture(gl, this.colorRampTexture, 2);
      }

      gl.uniform1i(uniMap.get("u_wind") || null, 0);
      gl.uniform1i(uniMap.get("u_particles") || null, 1);
      gl.uniform1i(uniMap.get("u_color_ramp") || null, 2);

      gl.uniform1f(
        uniMap.get("u_particles_res") || null,
        this.particleStateResolution
      );
      gl.uniform2f(
        uniMap.get("u_wind_min") || null,
        this.windData?.uMin ?? 0,
        this.windData?.vMin ?? 0
      );
      gl.uniform2f(
        uniMap.get("u_wind_max") || null,
        this.windData?.uMax ?? 0,
        this.windData?.vMax ?? 0
      );

      gl.drawArrays(gl.POINTS, 0, this.numParticles);
    }
  }

  updateParticles(gl: WebGLRenderingContext) {
    if (this.framebuffer && this.particleStateTexture1) {
      this.bindFramebuffer(gl, this.framebuffer, this.particleStateTexture1);
      gl.viewport(
        0,
        0,
        this.particleStateResolution,
        this.particleStateResolution
      );
    }

    if (this.updateProgram) {
      gl.useProgram(this.updateProgram.program);
      const uniMap = this.updateProgram.uniformMap;
      const aPos = this.updateProgram.attributeMap.get("a_pos") ?? -1;

      if (this.quadBuffer) {
        this.bindAttribute(gl, this.quadBuffer, aPos, 2);
      }

      gl.uniform1i(uniMap.get("u_wind") ?? null, 0);
      gl.uniform1i(uniMap.get("u_particles") ?? null, 1);

      gl.uniform1f(uniMap.get("u_rand_seed") || null, Math.random());
      gl.uniform2f(
        uniMap.get("u_wind_res") || null,
        this.windData?.width ?? 0,
        this.windData?.height ?? 0
      );
      gl.uniform2f(
        uniMap.get("u_wind_min") || null,
        this.windData?.uMin ?? 0,
        this.windData?.vMin ?? 0
      );
      gl.uniform2f(
        uniMap.get("u_wind_max") || null,
        this.windData?.uMax ?? 0,
        this.windData?.vMax ?? 0
      );
      gl.uniform1f(uniMap.get("u_speed_factor") || null, this.speedFactor);
      gl.uniform1f(uniMap.get("u_drop_rate") || null, this.dropRate);
      gl.uniform1f(uniMap.get("u_drop_rate_bump") || null, this.dropRateBump);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // swap the particle state textures so the new one becomes the current one
      const temp = this.particleStateTexture0;
      this.particleStateTexture0 = this.particleStateTexture1;
      this.particleStateTexture1 = temp;
    }
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
