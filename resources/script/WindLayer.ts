import AbstractGlLayer from "./AbstractGlLayer.js";

export default class WindLayer extends AbstractGlLayer {
  onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): void {
    console.log(map);
    console.log(gl);
  }

  doRender(gl: WebGLRenderingContext, matrix: number[]): void {
    console.log(gl);
    console.log(matrix);
  }
}
