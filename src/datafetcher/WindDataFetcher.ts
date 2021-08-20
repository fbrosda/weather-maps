import NoaaDataFetcher from "./NoaaDataFetcher";
import { Level, Variable, Grib2Json } from "./NoaaTypes";
import { PNG } from "pngjs";
import { promises as fs } from "fs";

export default class WindDataFetcher extends NoaaDataFetcher {
  variableConfigs = [
    {
      variable: Variable.WindX,
      level: Level.AboveGround10m
    },
    {
      variable: Variable.WindY,
      level: Level.AboveGround10m
    }
  ];
  prefix = "wind";

  constructor() {
    super();
  }

  writePng(data: Grib2Json[], path: string): Promise<void> {
    const ugrdData = data[0];
    const vgrdData = data[1];

    const width = ugrdData.Ni;
    const height = ugrdData.Nj - 1;

    const png = new PNG({
      colorType: 2,
      filterType: 4,
      width: width,
      height: height
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        // Conversion between x and longitude is linear, so nothing to do,
        // only y to latitude contains non-linear part
        const lat = y2lat(y, height);

        png.data[i + 0] = Math.floor(
          (255 *
            (interpolate([x, lat], ugrdData.values, width) -
              ugrdData.minimum)) /
            (ugrdData.maximum - ugrdData.minimum)
        );
        png.data[i + 1] = Math.floor(
          (255 *
            (interpolate([x, lat], vgrdData.values, width) -
              vgrdData.minimum)) /
            (vgrdData.maximum - vgrdData.minimum)
        );
        png.data[i + 2] = 0;
        png.data[i + 3] = 255;
      }
    }
    const pngBuffer = PNG.sync.write(png, {
      colorType: 2,
      filterType: 4
    });
    return fs.writeFile(path, pngBuffer);
  }

  writeJson(data: Grib2Json[], path: string): Promise<void> {
    const ugrdData = data[0];
    const vgrdData = data[1];

    return fs.writeFile(
      path,
      JSON.stringify(
        {
          source: "http://nomads.ncep.noaa.gov",
          width: ugrdData.Ni,
          height: ugrdData.Nj - 1,
          uMin: ugrdData.minimum,
          uMax: ugrdData.maximum,
          vMin: vgrdData.minimum,
          vMax: vgrdData.maximum
        },
        null,
        2
      )
    );
  }
}

function y2lat(y: number, height: number): number {
  const lat =
    (360 / Math.PI) *
      Math.atan(Math.exp(((180 - (y / height) * 360) * Math.PI) / 180)) -
    90;
  return ((-lat + 90) / 180) * height;
}

function interpolate(p: number[], v: number[], width: number): number {
  const y = p[1];
  const y1 = Math.floor(y);
  const y2 = Math.ceil(y);

  if (y1 === y2) {
    return v[getIndex(p[0], y, width)];
  } else {
    const q1 = v[getIndex(p[0], y1, width)] * (y - y1);
    const q2 = v[getIndex(p[0], y2, width)] * (y2 - y);
    return q1 + q2; // y2 - y1 === 1
  }
}

function getIndex(x: number, y: number, width: number): number {
  return y * width + ((x + width / 2) % width);
}
