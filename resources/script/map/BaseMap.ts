declare let mapboxgl: typeof import("mapbox-gl");

export default class BaseMap extends mapboxgl.Map {
  constructor(id: string) {
    super({
      container: id,
      style: "mapbox://styles/mapbox/dark-v10",
      center: [10, 47],
      minZoom: 1,
      maxZoom: 10,
      zoom: 2,
    });

    this.addControl(new mapboxgl.FullscreenControl());
    this.addControl(new mapboxgl.ScaleControl());
    this.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
  }
}
