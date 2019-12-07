import { DataFetcher, ReturnData } from "./DataFetcher";
import { getContent, ensureDir } from "../util.js";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { PNG } from "pngjs";
import { join } from "path";

enum Time {
  t0 = "00",
  t1 = "06",
  t2 = "12",
  t3 = "18"
}
enum Resolution {
  LOW = "1p00",
  MEDIUM = "0p50",
  HIGH = "0p25"
}
type WindParam = {
  date: string;
  time: Time;
  resolution: Resolution;
};
type Grib2Json = {
  source: string;
  minimum: number;
  maximum: number;
  Ni: number;
  Nj: number;
  values: number[];
};

export default class WindDataFetcher extends DataFetcher {
  baseurl = `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_`;
  basePath = `${process.env.PWD ?? ".."}/data`;
  param2file: Map<WindParam, Promise<Buffer>> = new Map();

  constructor() {
    super();

    this.type2Method.set(".png", this.fetchPng);
    this.type2Method.set(".json", this.fetchJson);
  }

  async fetchJson(query: object): Promise<ReturnData> {
    const param = this.parse(query);
    const data = await this.load(this.getName(param, "json"), param);
    return { data: data, type: "application/json" };
  }

  async fetchPng(query: object): Promise<ReturnData> {
    const param = this.parse(query);
    const data = await this.load(this.getName(param, "png"), param);
    return { data: data, type: "image/png" };
  }

  private async load(name: string, param: WindParam): Promise<Buffer> {
    // Make sure, that multiple requests for the same request don't spawn
    // multiple upstream requests.
    if (this.param2file.has(param)) {
      await this.param2file.get(param);
    }
    const promise = this.readFile(name, param);
    this.param2file.set(param, promise);

    const file = await promise;
    this.param2file.delete(param);
    return file;
  }

  private async readFile(name: string, param: WindParam): Promise<Buffer> {
    const path = this.getPath(name);
    try {
      await fs.stat(path);
      const file = await fs.readFile(path);
      return file;
    } catch (e) {
      ensureDir(this.basePath);
      await this.loadUpstream(param);
      const file = await fs.readFile(path);
      return file;
    }
  }

  private parse(query: { dateTime?: string; resolution?: string }): WindParam {
    const ret: WindParam = {
      date: formatDate(),
      time: Time.t0,
      resolution: Resolution.LOW
    };
    if (query.dateTime) {
      if (query.dateTime === "red" || query.dateTime === "green") {
        return {
          date: query.dateTime,
          time: Time.t0,
          resolution: Resolution.LOW
        };
      }
      const date = new Date(query.dateTime);
      if (date && !isNaN(date.getDate())) {
        ret.date = formatDate(date);
        ret.time =
          Time[`t${Math.floor(date.getHours() / 6)}` as keyof typeof Time];
      }
    }
    if (query.resolution) {
      const str = query.resolution;
      ret.resolution =
        Resolution[str.toUpperCase() as keyof typeof Resolution] ??
        ret.resolution;
    }
    return ret;

    function formatDate(date?: Date): string {
      const d = date ?? new Date();
      return `${d.getFullYear()}${d.getMonth() + 1}${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    }
  }

  private getName(param: WindParam, ext: string): string {
    return `${param.date}_${param.time}_${param.resolution}.${ext}`;
  }

  private getPath(name: string): string {
    return join(this.basePath, name);
  }

  private async loadUpstream(param: WindParam): Promise<boolean> {
    const url = this.getRequestUrl(param);
    const [ugrdData, vgrdData] = await Promise.all([
      this.fetchGribJson(url, "UGRD"),
      this.fetchGribJson(url, "VGRD")
    ]);

    const pngPath = this.getPath(this.getName(param, "png"));
    const jsonPath = this.getPath(this.getName(param, "json"));

    await Promise.all([
      this.writePng(ugrdData, vgrdData, pngPath),
      this.writeJson(ugrdData, vgrdData, jsonPath)
    ]);

    return true;
  }

  private async fetchGribJson(
    url: string,
    type: "UGRD" | "VGRD"
  ): Promise<Grib2Json> {
    const rawData = await getContent(`${url}&var_${type}=on`);
    const data = await this.grib2json(rawData);
    const jsonObject = JSON.parse(data);

    const tmp = jsonObject.messages[0].reduce(
      (
        acc: Map<string, number | number[]>,
        cur: { key: string; value: number }
      ) => acc.set(cur.key, cur.value),
      new Map()
    );
    return Object.fromEntries(tmp) as Grib2Json;
  }

  private writePng(
    ugrdData: Grib2Json,
    vgrdData: Grib2Json,
    path: string
  ): Promise<void> {
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
        const k = y * width + ((x + width / 2) % width);
        png.data[i + 0] = Math.floor(
          (255 * (ugrdData.values[k] - ugrdData.minimum)) /
            (ugrdData.maximum - ugrdData.minimum)
        );
        png.data[i + 1] = Math.floor(
          (255 * (vgrdData.values[k] - vgrdData.minimum)) /
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

  private writeJson(
    ugrdData: Grib2Json,
    vgrdData: Grib2Json,
    path: string
  ): Promise<void> {
    return fs.writeFile(
      path,
      JSON.stringify(
        {
          source: "http://nomads.ncep.noaa.gov",
          // date: formatDate(u.dataDate + '', u.dataTime),
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

  private getRequestUrl(param: WindParam): string {
    const BBOX = "leftlon=0&rightlon=360&toplat=90&bottomlat=-90";
    const LEVEL = "lev_10_m_above_ground=on";

    return `${this.baseurl}${param.resolution}.pl?file=gfs.t${
      param.time
    }z.pgrb2${param.resolution == Resolution.MEDIUM ? "full" : ""}.${
      param.resolution
    }.f000&${LEVEL}&${BBOX}&dir=%2Fgfs.${param.date}%2F${param.time}`;
  }

  private grib2json(rawData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const cp = exec("grib_dump -j -", (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      });
      if (cp && cp.stdin) {
        cp.stdin.end(rawData);
      }
    });
  }
}
