import DataFetcher from "./DataFetcher";
import { getContent } from "../util.js";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { PNG } from "pngjs";

export default class WindDataFetcher extends DataFetcher {
  constructor() {
    super();

    this.baseurl = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl";
  }

  async fetch(query: object): Promise<Buffer> {
    const url = this.getRequestUrl(query);
    const arr = await Promise.all([
      getContent(`${url}&var_UGRD=on`),
      getContent(`${url}&var_VGRD=on`)
    ]);

    await fs.writeFile("/tmp/utmp.grib", arr[0], "binary");
    await fs.writeFile("/tmp/vtmp.grib", arr[1], "binary");

    await promisify(exec)(
      "grib_set -r -s packingType=grid_simple /tmp/utmp.grib /tmp/utmp.grib"
    );
    await promisify(exec)(
      "grib_set -r -s packingType=grid_simple /tmp/vtmp.grib /tmp/vtmp.grib"
    );

    const utmp = await promisify(exec)("grib_dump -j /tmp/utmp.grib");
    const vtmp = await promisify(exec)("grib_dump -j /tmp/vtmp.grib");

    const utmpData = JSON.parse(utmp.stdout);
    const vtmpData = JSON.parse(vtmp.stdout);


    const u = utmpData.messages[0].reduce(
      (acc: any, cur: any) => ((acc[cur.key] = cur.value), acc),
      {}
    );
    const v = vtmpData.messages[0].reduce(
      (acc: any, cur: any) => ((acc[cur.key] = cur.value), acc),
      {}
    );

    const width = u.Ni;
    const height = u.Nj - 1;

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
          (255 * (u.values[k] - u.minimum)) / (u.maximum - u.minimum)
        );
        png.data[i + 1] = Math.floor(
          (255 * (v.values[k] - v.minimum)) / (v.maximum - v.minimum)
        );
        png.data[i + 2] = 0;
        png.data[i + 3] = 255;
      }
    }

    return PNG.sync.write(png, {
      colorType: 2,
      filterType: 4,
    });
  }

  private getRequestUrl(query: object): string {
    if (query || true) {
      const GFS_DATE = "20191123";
      const GFS_TIME = "00"; // 00, 06, 12, 18
      const BBOX = "leftlon=0&rightlon=360&toplat=90&bottomlat=-90";
      const LEVEL = "lev_10_m_above_ground=on";

      return `${this.baseurl}?file=gfs.t${GFS_TIME}z.pgrb2.1p00.f000&${LEVEL}&${BBOX}&dir=%2Fgfs.${GFS_DATE}%2F${GFS_TIME}`;
    }
  }
}
