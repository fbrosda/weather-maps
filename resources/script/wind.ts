import BaseMap from "./map/BaseMap.js";
import WindLayer from "./layer/WindLayer.js";

async function init(): Promise<maplibregl.Map> {
  const map = new BaseMap("map");
  (window as any).layer = new WindLayer(map);
  return map;
}

init();
