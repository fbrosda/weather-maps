import AbstractCustomLayer from "./AbstractCustomLayer.js";
import WindGlLayer from "./WindGlLayer.js";
import { ShaderType } from "../util/util.js";

export default class WindLayer extends AbstractCustomLayer {
  shaders: Promise<string[]>;
  visibleCheckbox: HTMLInputElement;
  numParticlesInput: HTMLInputElement;
  resolutionSelect: HTMLSelectElement;
  forecastSelect: HTMLSelectElement;
  playButton: HTMLButtonElement;
  playInterval?: any;

  constructor(map?: mapboxgl.Map) {
    super("wind", map);
    this.shaders = Promise.all([
      this.loadShaderSource(ShaderType.VERTEX, "draw"),
      this.loadShaderSource(ShaderType.VERTEX, "quad"),
      this.loadShaderSource(ShaderType.FRAGMENT, "draw"),
      this.loadShaderSource(ShaderType.FRAGMENT, "screen"),
      this.loadShaderSource(ShaderType.FRAGMENT, "update"),
    ]);

    this.visibleCheckbox = document.getElementById(
      "visible"
    ) as HTMLInputElement;
    this.createVisibleCheckbox();

    this.numParticlesInput = document.getElementById(
      "numParticles"
    ) as HTMLInputElement;
    this.createNumParticlesInput();

    this.resolutionSelect = document.getElementById(
      "resolution"
    ) as HTMLSelectElement;
    this.createResolutionSelect();

    this.forecastSelect = document.getElementById(
      "forecast"
    ) as HTMLSelectElement;
    this.createForecastSelect();

    this.playButton = document.getElementById("play") as HTMLButtonElement;
    this.createPlayButton();
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

    this.changeForecastAndResolution();
  }

  toggle(): void {
    super.toggle();
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.clear();
      layer.map.triggerRepaint();
    }
  }

  private async changeForecastAndResolution(): Promise<void> {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      const forecast =
        this.forecastSelect.options[this.forecastSelect.selectedIndex];
      const resolution =
        this.resolutionSelect.options[this.resolutionSelect.selectedIndex];
      await layer.loadWindData(forecast.value, resolution.value);
    }
  }

  private setNumParticles(): void {
    if (this.layer) {
      const layer = this.layer as WindGlLayer;
      layer.setNumParticles(2 ** parseInt(this.numParticlesInput.value, 10));
    }
  }

  private togglePlay(): void {
    const doPlay = this.playButton.innerHTML === "Play";
    const func = updateDate.bind(this);

    if (doPlay) {
      this.playButton.innerHTML = "Stop";
      this.playInterval = setTimeout(func, 800);
    } else {
      this.playButton.innerHTML = "Play";
      clearInterval(this.playInterval);
      delete this.playInterval;
    }

    async function updateDate(this: WindLayer): Promise<void> {
      const curIndex = this.forecastSelect.selectedIndex;
      const length = this.forecastSelect.options.length;
      this.forecastSelect.selectedIndex = (curIndex + 1) % length;
      await this.changeForecastAndResolution();

      this.playInterval = setTimeout(func, 3000);
    }
  }

  private createResolutionSelect(): void {
    const f = this.changeForecastAndResolution.bind(this);
    this.resolutionSelect.addEventListener("change", f);
    this.handler.push(() =>
      this.resolutionSelect.removeEventListener("change", f)
    );
  }

  private createForecastSelect(): void {
    const now = new Date();
    now.setUTCHours(Math.floor(now.getHours() / 6) * 6, 0, 0, 0);
    for (let i = 1; i < 80; i++) {
      now.setHours(now.getHours() + 3);

      const child = document.createElement("option");
      child.value = i.toString();
      child.innerHTML = now.toLocaleString();
      this.forecastSelect.appendChild(child);
    }

    const f = (): void => {
      if (this.playInterval) {
        this.togglePlay();
      }
      this.changeForecastAndResolution();
    };
    this.forecastSelect.addEventListener("change", f);
    this.handler.push(() =>
      this.forecastSelect.removeEventListener("change", f)
    );
  }

  private createPlayButton(): void {
    const f = this.togglePlay.bind(this);
    this.playButton.addEventListener("click", f);
    this.handler.push(() => this.playButton.removeEventListener("click", f));
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
