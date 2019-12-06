export default class ExtProgram {
  private program: WebGLProgram;
  private attributeMap: Map<string, GLint> = new Map();
  private uniformMap: Map<string, WebGLUniformLocation> = new Map();

  constructor(gl: WebGLRenderingContext, program: WebGLProgram) {
    this.program = program;

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
  }

  getProgram(): WebGLProgram {
    return this.program;
  }

  getUniform(name: string): WebGLUniformLocation | null {
    return this.uniformMap.get(name) ?? null;
  }

  getAttribute(name: string): GLint {
    return this.attributeMap.get(name) ?? -1;
  }
}
