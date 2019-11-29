# About

This project is a little playground to experiment with custom webgl layers in
mapbox-gl.

Examples:

## triangle.html

A simple copy of the [Getting
Started](https://docs.mapbox.com/mapbox-gl-js/example/custom-style-layer/)
example from mapbox
 
## wind.html

This is heavily based on [webgl-wind](https://github.com/mapbox/webgl-wind). The
download part is integrated into the server (`WindDataFetcher`) and the actual
rendering from `src/index.js` is adjusted to work with CustomLayers, which were
not available, by that time.

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
