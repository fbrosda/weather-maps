import BaseMap from "./map/BaseMap.js";
import TriangleLayer from "./layer/TriangleLayer.js";

async function init(): Promise<maplibregl.Map> {
  const map = new BaseMap("map");
  new TriangleLayer(map);

  return map;
}

init();
