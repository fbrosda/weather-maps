import ExtProgram from "../util/ExtProgram.js";

export default abstract class AbstractGlLayer {
  map: mapboxgl.Map;
  gl: WebGLRenderingContext;
  shaders: string[];

  prerender?(matrix: number[]): void;
  abstract render(matrix: number[]): void;

  constructor(shaders: string[], map: mapboxgl.Map, gl: WebGLRenderingContext) {
    this.map = map;
    this.gl = gl;
    this.shaders = shaders;
  }

  protected createProgram(
    vertexSource: string,
    fragmentSource: string
  ): ExtProgram {
    const gl = this.gl;
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Could not create WebGLProgram!");
    }

    const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(
      gl.FRAGMENT_SHADER,
      fragmentSource
    );

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "GLProgram error!");
    }
    return new ExtProgram(gl, program);
  }

  protected createTexture(
    filter: GLint,
    data: Uint8Array | HTMLImageElement,
    width?: number,
    height?: number
  ): WebGLTexture {
    const gl = this.gl;
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

  protected bindTexture(texture: WebGLTexture, unit: number): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  }

  protected createBuffer(data: Float32Array): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) {
      throw new Error("Could not create buffer!");
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    return buffer;
  }

  protected bindAttribute(
    buffer: WebGLBuffer,
    attribute: GLint,
    numComponents: number
  ): void {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.enableVertexAttribArray(attribute);
    this.gl.vertexAttribPointer(
      attribute,
      numComponents,
      this.gl.FLOAT,
      false,
      0,
      0
    );
  }

  protected bindFramebuffer(
    framebuffer: WebGLFramebuffer | null,
    texture?: WebGLTexture
  ): void {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    if (texture) {
      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0,
        this.gl.TEXTURE_2D,
        texture,
        0
      );
    }
  }

  private createShader(type: GLenum, source: string): WebGLShader {
    const gl = this.gl;
    const shader = this.gl.createShader(type);
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
