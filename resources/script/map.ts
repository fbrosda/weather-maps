declare var mapboxgl: typeof import('mapbox-gl');

export function creatMap( id: string ): mapboxgl.Map {
  var map = new mapboxgl.Map({
    container: id,
    style: 'mapbox://styles/mapbox/dark-v10'
  });
  return map;
}

