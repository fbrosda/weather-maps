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
        const lat = this.y2lat(y, height);
        png.data[i + 0] = Math.floor(
          (255 *
            (this.interpolate([x, lat], ugrdData.values, width) -
              ugrdData.minimum)) /
            (ugrdData.maximum - ugrdData.minimum)
        );
        png.data[i + 1] = Math.floor(
          (255 *
            (this.interpolate([x, lat], vgrdData.values, width) -
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
