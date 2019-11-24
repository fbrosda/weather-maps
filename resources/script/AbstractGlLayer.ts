import { fetch } from "./util.js";

export default abstract class AbstractGlLayer
  implements mapboxgl.CustomLayerInterface {
  id: string;
  map: mapboxgl.Map;
  type: "custom";
  renderingMode: "2d";
  visible: boolean;

  program?: WebGLProgram;

  attributeMap: Map<string, GLint>;
  uniformMap: Map<string, WebGLUniformLocation>;

  abstract onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): void;
  abstract doRender(gl: WebGLRenderingContext, matrix: number[]): void;

  constructor(id: string, map: mapboxgl.Map) {
    this.id = id;
    this.map = map;
    this.type = "custom";
    this.renderingMode = "2d";
    this.visible = true;

    this.attributeMap = new Map();
    this.uniformMap = new Map();

    map.on("load", () => map.addLayer(this));
  }

  toggle(): void {
    this.visible = !this.visible;
    this.map.resize();
  }

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    if (this.visible) {
      this.doRender(gl, matrix);
    }
  }

  // async loadShaders(gl: WebGLRenderingContext): Promise<WebGLProgram | void> {
  //   const fragURL = `/resources/shader/${this.id}.frag`;
  //   const vertURL = `/resources/shader/${this.id}.vert`;

  //   const fragSource = await fetch<string>(fragURL);
  //   const vertSource = await fetch<string>(vertURL);

  //   // create a vertex shader
  //   const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  //   if (vertexShader) {
  //     gl.shaderSource(vertexShader, vertSource);
  //     gl.compileShader(vertexShader);
  //   }

  //   // create a fragment shader
  //   const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  //   if (fragmentShader) {
  //     gl.shaderSource(fragmentShader, fragSource);
  //     gl.compileShader(fragmentShader);
  //   }

  //   // link the two shaders into a WebGL program
  //   const program = gl.createProgram();
  //   if (program && vertexShader && fragmentShader) {
  //     this.program = program;
  //     gl.attachShader(this.program, vertexShader);
  //     gl.attachShader(this.program, fragmentShader);
  //     gl.linkProgram(this.program);
  //     return program;
  //   }
  //   return;
  // }

  protected loadShaderSource(
    gl: WebGLRenderingContext,
    name: string | null,
    type: GLenum
  ): Promise<string> {
    const url = `/resources/shader/${name || this.id}.${
      type === gl.VERTEX_SHADER ? "vert" : "frag"
    }`;
    return fetch<string>(url);
  }

  protected createProgram(
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string
  ): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Could not create WebGLProgram!");
    }

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentSource
    );

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "GLProgram error!");
    }

    const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < numAttributes; i++) {
      const attribute = gl.getActiveAttrib(program, i);
      if (attribute) {
        this.attributeMap.set(
          attribute.name,
          gl.getAttribLocation(program, attribute.name)
        );
      }
    }
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const uniform = gl.getActiveUniform(program, i);
      if (uniform) {
        const location = gl.getUniformLocation(program, uniform.name);
        if (location) {
          this.uniformMap.set(uniform.name, location);
        }
      }
    }

    return program;
  }

  private createShader(
    gl: WebGLRenderingContext,
    type: GLenum,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error("Error when creating shader!");
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "");
    }
    return shader;
  }
}
