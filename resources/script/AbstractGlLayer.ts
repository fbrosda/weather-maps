import { fetch } from "./util.js";

export default abstract class AbstractGlLayer
  implements mapboxgl.CustomLayerInterface {
  id: string;
  map: mapboxgl.Map;
  type: "custom";
  renderingMode: "2d";
  visible: boolean;

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

    // map.on("load", () => map.addLayer(this));
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

  protected createTexture(
    gl: WebGLRenderingContext,
    filter: GLint,
    data: Uint8Array | HTMLImageElement,
    width?: number,
    height?: number
  ): WebGLTexture {
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Could not create texture!");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    if (width && height && data instanceof Uint8Array) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
      );
    } else if (data instanceof HTMLImageElement) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  protected bindTexture(
    gl: WebGLRenderingContext,
    texture: WebGLTexture,
    unit: number
  ): void {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  protected createBuffer(
    gl: WebGLRenderingContext,
    data: Float32Array
  ): WebGLBuffer {
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Could not create buffer!");
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
  }

  protected bindAttribute(
    gl: WebGLRenderingContext,
    buffer: WebGLBuffer,
    attribute: string,
    numComponents: number
  ): void {
    const glAttribute = this.attributeMap.get(attribute) ?? -1;

    if (glAttribute > -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(glAttribute);
      gl.vertexAttribPointer(glAttribute, numComponents, gl.FLOAT, false, 0, 0);
    }
  }

  protected bindFramebuffer(
    gl: WebGLRenderingContext,
    framebuffer: WebGLFramebuffer | null,
    texture?: WebGLTexture
  ): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    if (texture) {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
    }
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
