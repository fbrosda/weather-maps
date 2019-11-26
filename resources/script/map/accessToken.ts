declare let mapboxgl: typeof import("mapbox-gl");
import { fetch } from "../util/util.js";

export default async function accessToken(): Promise<void> {
  const token = await fetch<string>("/mapboxToken");
  if (typeof mapboxgl != "undefined") {
    mapboxgl.accessToken = token;
  } else {
    throw new Error("Mapbox-GL not loaded!");
  }
}
