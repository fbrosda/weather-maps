import accessToken from "./map/accessToken.js";
import BaseMap from "./map/BaseMap.js";
import CombinedLayer from "./layer/CombinedLayer.js";

async function init(): Promise<mapboxgl.Map> {
  await accessToken();
  const map = new BaseMap("map");
  (window as any).layer = new CombinedLayer(map);
  return map;
}

init();
