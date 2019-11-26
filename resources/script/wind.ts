import accessToken from "./map/accessToken.js";
import BaseMap from "./map/BaseMap.js";
import WindLayer from "./layer/WindLayer.js";

async function init(): Promise<mapboxgl.Map> {
  await accessToken();
  const map = new BaseMap("map");
  new WindLayer(map);
  return map;
}

init();
