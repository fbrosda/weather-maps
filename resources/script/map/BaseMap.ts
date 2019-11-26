declare let mapboxgl: typeof import("mapbox-gl");

export default class BaseMap extends mapboxgl.Map {
  constructor(id: string) {
    super({
      container: id,
      style: "mapbox://styles/mapbox/dark-v10"
    });
  }
}
