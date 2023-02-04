import BaseMap from "./map/BaseMap.js";
import CombinedLayer from "./layer/CombinedLayer.js";

async function init(): Promise<maplibregl.Map> {
  const map = new BaseMap("map");
  (window as any).layer = new CombinedLayer(map);
  return map;
}

init();
