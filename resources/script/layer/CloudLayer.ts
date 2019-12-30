import AbstractCustomLayer from "./AbstractCustomLayer.js";
import CloudGlLayer from "./CloudGlLayer.js";
import { ShaderType } from "../util/util.js";

export default class CloudLayer extends AbstractCustomLayer {
  shaders: Promise<string[]>;

  constructor(map?: mapboxgl.Map) {
    super("cloud", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX),
      this.loadShaderSource(ShaderType.FRAGMENT)
    ]);
  }

  async onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const shaders = await this.shaders;
    const layer = new CloudGlLayer(shaders, map, gl);
    this.layer = layer;

    layer.loadCloudData();
  }
}
