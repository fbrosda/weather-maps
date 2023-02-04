declare let maplibregl: typeof import("maplibre-gl");

export default class BaseMap extends maplibregl.Map {
  constructor(id: string) {
    super({
      container: id,
      style: "https://demotiles.maplibre.org/style.json",
      center: [10, 47],
      minZoom: 1,
      maxZoom: 10,
      zoom: 2,
    });

    this.addControl(new maplibregl.FullscreenControl({}));
    this.addControl(new maplibregl.ScaleControl({}));
    this.addControl(new maplibregl.NavigationControl({ showCompass: false }));
  }
}
