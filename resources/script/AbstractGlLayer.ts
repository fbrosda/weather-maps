declare let mapboxgl: typeof import("mapbox-gl");

import { fetch } from "./util.js";

export default abstract class AbstractGlLayer implements mapboxgl.CustomLayerInterface {
  id: string;
  map: mapboxgl.Map;
  type: "custom";
  renderingMode: "2d";
  visible: boolean;

  program?: WebGLProgram;
  buffer: WebGLBuffer;

  constructor(id: string, map: mapboxgl.Map) {
    this.id = id;
    this.map = map;
    this.type = "custom";
    this.renderingMode = "2d";
    this.visible = true;

    map.on("load", () => map.addLayer(this));
  }

  toggle(): void {
    this.visible = !this.visible;
    this.map.resize();
  }

  async loadShaders(gl: WebGLRenderingContext): Promise<WebGLProgram> {
    const fragURL = `/resources/shader/${this.id}.frag`;
    const vertURL = `/resources/shader/${this.id}.vert`;

    const fragSource = await fetch<string>(fragURL);
    const vertSource = await fetch<string>(vertURL);

    // create a vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertSource);
    gl.compileShader(vertexShader);

    // create a fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragSource);
    gl.compileShader(fragmentShader);

    // link the two shaders into a WebGL program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    return this.program;
  }

  abstract onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): void;
  abstract doRender(gl: WebGLRenderingContext, matrix: number[]): void;

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    if( this.visible ) {
      this.doRender( gl, matrix );
    }
  }
}
