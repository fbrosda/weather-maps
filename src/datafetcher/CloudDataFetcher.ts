import NoaaDataFetcher from "./NoaaDataFetcher";
import { Variable, Level, Grib2Json } from "./NoaaTypes";
import { PNG } from "pngjs";
import { promises as fs } from "fs";

export default class CloudDataFetcher extends NoaaDataFetcher {
  variableConfigs = [
    {
      variable: Variable.CloudCover,
      level: Level.CloudLayer
    },
    {
      variable: Variable.Precipitation,
      level: Level.Surface
    },
    {
      variable: Variable.SnowPercentage,
      level: Level.Surface
    }
  ];
  prefix = "cloud";

  constructor() {
    super();
  }

  writePng(data: Grib2Json[], path: string): Promise<void> {
    const cloudData = data[0];
    const precipitationData = data[1];
    const snowData = data[2];

    const width = cloudData.Ni;
    const height = cloudData.Nj - 1;

    const png = new PNG({
      colorType: 2,
      filterType: 4,
      width: width,
      height: height
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const k = y * width + ((x + width / 2) % width);
        png.data[i + 0] = Math.floor(
          (255 * (cloudData.values[k] - cloudData.minimum)) /
            (cloudData.maximum - cloudData.minimum)
        );
        png.data[i + 1] = Math.floor(
          255 *
            Math.pow(
              (precipitationData.values[k] - precipitationData.minimum) /
                (precipitationData.maximum - precipitationData.minimum),
              0.2
            )
        );
        png.data[i + 2] = Math.floor(
          (255 * (snowData.values[k] - snowData.minimum)) /
            (snowData.maximum - snowData.minimum)
        );
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
    const cloudData = data[0];
    const precipitationData = data[1];
    const snowData = data[2];

    return fs.writeFile(
      path,
      JSON.stringify(
        {
          source: "http://nomads.ncep.noaa.gov",
          width: cloudData.Ni,
          height: cloudData.Nj - 1,
          cMin: cloudData.minimum,
          cMax: cloudData.maximum,
          pMin: precipitationData.minimum,
          pMax: precipitationData.maximum,
          sMin: snowData.minimum,
          sMax: snowData.maximum
        },
        null,
        2
      )
    );
  }
}
