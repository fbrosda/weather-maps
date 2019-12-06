import AbstractCustomLayer from "./AbstractCustomLayer.js";
import WindGlLayer from "./WindGlLayer.js";
import { ShaderType } from "../util/util.js";

export default class WindLayer extends AbstractCustomLayer {
  shaders: Promise<string[]>;
  visibleCheckbox: HTMLInputElement;
  dateSelect: HTMLSelectElement;
  numParticlesInput: HTMLInputElement;

  constructor(map?: mapboxgl.Map) {
    super("wind", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX, "draw"),
      this.loadShaderSource(ShaderType.VERTEX, "quad"),
      this.loadShaderSource(ShaderType.FRAGMENT, "draw"),
      this.loadShaderSource(ShaderType.FRAGMENT, "screen"),
      this.loadShaderSource(ShaderType.FRAGMENT, "update")
    ]);

    this.visibleCheckbox = document.getElementById(
      "visible"
    ) as HTMLInputElement;
    this.createVisibleCheckbox();

    this.dateSelect = document.getElementById("date") as HTMLSelectElement;
    this.createDateSelect();

    this.numParticlesInput = document.getElementById(
      "numParticles"
    ) as HTMLInputElement;
    this.createNumParticlesInput();
  }

  async onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext): Promise<void> {
    const shaders = await this.shaders;
    const layer = new WindGlLayer(shaders, map, gl);
    this.layer = layer;

    this.setNumParticles();
    this.addListener(map, ["zoomstart", "mousedown"], () => {
      if (this.visibleCheckbox.checked) this.toggle();
    });
    this.addListener(map, ["zoomend", "mouseup"], () => {
      if (this.visibleCheckbox.checked) this.toggle();
    });

    const f = (): void => {
      if (this.visibleCheckbox.checked) {
        this.toggle();
        setTimeout(this.toggle.bind(this), 200);
      }
    };
    document.addEventListener("fullscreenchange", f);
    this.handler.push(() =>
      document.removeEventListener("fullscreenchange", f)
    );

    this.changeDate();
  }

  toggle(): void {
    super.toggle();
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.clear();
      layer.map.triggerRepaint();
    }
  }

  private async changeDate(): Promise<void> {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      const option = this.dateSelect.options[this.dateSelect.selectedIndex];
      // this.toggle();
      await layer.loadWindData(option.value);
      // this.toggle();
    }
  }

  private setNumParticles(): void {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.setNumParticles(2 ** parseInt(this.numParticlesInput.value, 10));
    }
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

    const f = this.changeDate.bind(this);
    this.dateSelect.addEventListener("change", f);
    this.handler.push(() => this.dateSelect.removeEventListener("change", f));
  }

  private createNumParticlesInput(): void {
    const f = this.setNumParticles.bind(this);
    this.numParticlesInput.addEventListener("change", f);
    this.handler.push(() =>
      this.numParticlesInput.removeEventListener("change", f)
    );
  }

  private createVisibleCheckbox(): void {
    this.visible = this.visibleCheckbox.checked;

    const f = this.toggle.bind(this);
    this.visibleCheckbox.addEventListener("change", f);
    this.handler.push(() =>
      this.visibleCheckbox.removeEventListener("change", f)
    );
  }
}
