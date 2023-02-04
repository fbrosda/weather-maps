import BaseMap from "./map/BaseMap.js";
import CloudLayer from "./layer/CloudLayer.js";

async function init(): Promise<maplibregl.Map> {
  const map = new BaseMap("map");
  (window as any).layer = new CloudLayer(map);
  return map;
}

init();
