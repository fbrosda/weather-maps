import { fetch, ShaderType } from "../util/util.js";
import AbstractGlLayer from "./AbstractGlLayer.js";

export default abstract class AbstractCustomLayer
  implements mapboxgl.CustomLayerInterface {
  id: string;
  type: "custom" = "custom";
  renderingMode: "2d" = "2d";
  visible = true;

  layer?: AbstractGlLayer;

  abstract onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): void;

  constructor(id: string, map?: mapboxgl.Map) {
    this.id = id;

    if (map) {
      this.addTo(map);
    }
  }

  addTo(map: mapboxgl.Map): void {
    map.on("load", () => map.addLayer(this));
  }

  toggle(): void {
    this.visible = !this.visible;
  }

  onRemove(): void {
    delete this.layer;
  }

  prerender(gl: WebGLRenderingContext, matrix: number[]): void {
    if (this.visible && this.layer && this.layer.prerender) {
      this.layer.gl = gl;
      this.layer.prerender(matrix);
    }
  }

  render(gl: WebGLRenderingContext, matrix: number[]): void {
    if (this.visible && this.layer) {
      this.layer.gl = gl;
      this.layer.render(matrix);
    }
  }

  protected loadShaderSource(type: ShaderType, name?: string): Promise<string> {
    const url = `/resources/shader/${this.id}${name ? `_${name}` : ""}.${type}`;
    return fetch<string>(url);
  }
}
