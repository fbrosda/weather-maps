import AbstractCustomLayer from "./AbstractCustomLayer.js";
import WindGlLayer from "./WindGlLayer.js";
import { ShaderType } from "../util/util.js";

export default class WindLayer extends AbstractCustomLayer {
  shaders: Promise<string[]>;
  dateSelect: HTMLSelectElement;

  constructor(map?: mapboxgl.Map) {
    super("wind", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX, "draw"),
      this.loadShaderSource(ShaderType.VERTEX, "quad"),
      this.loadShaderSource(ShaderType.FRAGMENT, "draw"),
      this.loadShaderSource(ShaderType.FRAGMENT, "screen"),
      this.loadShaderSource(ShaderType.FRAGMENT, "update")
    ]);

    this.dateSelect =
      (document.getElementById("date") as HTMLSelectElement) ??
      document.createElement("select");
    this.createDateSelect();
  }

  toggle(): void {
    super.toggle();
    if( this.layer ) {
      const layer = (this.layer as WindGlLayer);
      layer.clear();
      layer.map.triggerRepaint();
    }
  }

  async changeDate(): Promise<void> {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      const option = this.dateSelect.options[this.dateSelect.selectedIndex];
      this.toggle();
      await layer.loadWindData(new Date(option.value));
      this.toggle();
    }
  }

  async onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const shaders = await this.shaders;
    const layer = new WindGlLayer(shaders, map, gl);
    this.layer = layer;

    this.addListener(map, ["zoomstart", "mousedown"], this.toggle);
    this.addListener(map, ["zoomend", "mouseup"], this.toggle);

    const f = (): void => {
      this.toggle();
      setTimeout(this.toggle.bind(this), 200);
    };
    document.addEventListener("fullscreenchange", f);
    this.handler.push(() =>
      document.removeEventListener("fullscreenchange", f)
    );
  }

  private createDateSelect(): void {
    const now = new Date();
    now.setUTCHours(Math.floor(now.getHours() / 6) * 6, 0, 0, 0);
    for (let i = 0; i < 38; i++) {
      now.setHours(now.getHours() - 6);

      const child = document.createElement("option");
      child.value = now.toISOString();
      child.innerHTML = now.toLocaleString();
      this.dateSelect.appendChild(child);
    }

    this.dateSelect.addEventListener("change", this.changeDate.bind(this));
  }
}
