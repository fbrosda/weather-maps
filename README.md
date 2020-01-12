# About

This project is a little playground to experiment with custom webgl layers in
mapbox-gl.

Examples:

## triangle.html

A simple copy of the [Getting
Started](https://docs.mapbox.com/mapbox-gl-js/example/custom-style-layer/)
example from mapbox
 
## wind.html

This is heavily based on [webgl-wind](https://github.com/mapbox/webgl-wind).

The download part is integrated into the server (`WindDataFetcher`) and the
actual rendering from `src/index.js` is adjusted to work with CustomLayers,
which were not available, by that time.

## Next Steps

- [x] Adjust wind speed and particle number by zoomlevel
- [x] Timestamp selection in the ui
- [x] Animate transition between timestamps
- [X] Cloud data
- [X] Combine cloud and wind data
- [ ] Open Problems in combined wind cloud layer:
	- [X] Flickering particles, as pseudo random numbers in the two update shaders
		don't match
	- [ ] Fade out cloud color
	- [ ] Blending between cloud data
- [ ] Repeatable textures: Only possible, if width/height is a power of two.

# Setup

## Access Token

Get a access token from mapbox and save in the root dir of this project as
`.accessToken.txt`.

## External Dependencies

This project uses
[ecCodes](https://confluence.ecmwf.int//display/ECC/ecCodes+Home) to convert the
binary data fetched from [NOMADS](https://nomads.ncep.noaa.gov/) to json and
png.

## Start Server

```
npm install
npm run build
npm start
```

This will start a http server on port 3000. You can then navigate to
`localhost:3000` in your favorite browser.
