import accessToken from "./map/accessToken.js";
import BaseMap from "./map/BaseMap.js";
import TriangleLayer from "./layer/TriangleLayer.js";

async function init(): Promise<mapboxgl.Map> {
  await accessToken();
  const map = new BaseMap("map");
  new TriangleLayer(map);

  return map;
}

init();
