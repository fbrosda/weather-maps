declare let mapboxgl: typeof import("mapbox-gl");

import { creatMap } from "./map.js";
import { fetch } from "./util.js";
import TriangleLayer from "./TriangleLayer.js";

async function init(): Promise<void> {
  (mapboxgl as any).accessToken = await fetch("/mapboxToken");
  const map = creatMap("map");
  const layer = new TriangleLayer(map);

  (window as any).layer = layer;
}

init();
