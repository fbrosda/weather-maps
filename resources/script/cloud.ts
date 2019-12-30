import accessToken from "./map/accessToken.js";
import BaseMap from "./map/BaseMap.js";
import CloudLayer from "./layer/CloudLayer.js";

async function init(): Promise<mapboxgl.Map> {
  await accessToken();
  const map = new BaseMap("map");
  (window as any).layer = new CloudLayer(map);
  return map;
}

init();

