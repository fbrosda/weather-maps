import { DataFetcher, ReturnData } from "./DataFetcher";
import {
  Time,
  Resolution,
  NoaaParam,
  VariableConfig,
  Grib2Json
} from "./NoaaTypes.js";
import { getContent, ensureDir } from "../util.js";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { join } from "path";

export default abstract class NoaaDataFetcher extends DataFetcher {
  baseurl = `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_`;
  basePath = `${process.env.PWD ?? ".."}/data`;
  param2file: Map<NoaaParam, Promise<Buffer>> = new Map();

  abstract variableConfigs: VariableConfig[];
  abstract prefix: string;

  abstract writePng(data: Grib2Json[], path: string): Promise<void>;
  abstract writeJson(data: Grib2Json[], path: string): Promise<void>;

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

  private async load(name: string, param: NoaaParam): Promise<Buffer> {
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

  private async readFile(name: string, param: NoaaParam): Promise<Buffer> {
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

  private parse(query: {
    dateTime?: string;
    resolution?: string;
    forecast?: string;
  }): NoaaParam {
    const now = new Date();
    now.setUTCHours(now.getUTCHours() - 6);
    const ret: NoaaParam = {
      date: formatDate(now),
      time: Time[`t${Math.floor(now.getHours() / 6)}` as keyof typeof Time],
      forecast: 1,
      resolution: Resolution.LOW,
      variableConfigs: this.variableConfigs
    };

    if (query.dateTime) {
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

    if (query.forecast) {
      ret.forecast = parseInt(query.forecast, 10);
    }
    return ret;

    function formatDate(date?: Date): string {
      const d = date ?? new Date();
      return `${d.getFullYear()}${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    }
  }

  private getName(param: NoaaParam, ext: string): string {
    return `${this.prefix}_${param.date}_${param.time}_${param.resolution}_${param.forecast}.${ext}`;
  }

  private getPath(name: string): string {
    return join(this.basePath, name);
  }

  private async loadUpstream(param: NoaaParam): Promise<boolean> {
    const url = this.getRequestUrl(param);
    const data = await Promise.all(
      this.variableConfigs.map(variable => this.fetchGribJson(url, variable))
    );

    const pngPath = this.getPath(this.getName(param, "png"));
    const jsonPath = this.getPath(this.getName(param, "json"));

    await Promise.all([
      this.writePng(data, pngPath),
      this.writeJson(data, jsonPath)
    ]);

    return true;
  }

  private async fetchGribJson(
    url: string,
    config: VariableConfig
  ): Promise<Grib2Json> {
    const rawData = await getContent(
      `${url}&${config.level}=on&var_${config.variable}=on`
    );
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

  private getRequestUrl(param: NoaaParam): string {
    const BBOX = "leftlon=0&rightlon=360&toplat=90&bottomlat=-90";

    return `${this.baseurl}${param.resolution}.pl?file=gfs.t${
      param.time
    }z.pgrb2${param.resolution == Resolution.MEDIUM ? "full" : ""}.${
      param.resolution
    }.f${(3 * param.forecast).toString().padStart(3, "0")}&${BBOX}&dir=%2Fgfs.${
      param.date
    }%2F${param.time}%2Fatmos`;
  }

  private grib2json(rawData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const cp = exec(
        "grib_dump -j -",
        { maxBuffer: 50 * 2 ** 20 },
        (err, stdout) => {
          if (err) {
            reject(err);
          } else {
            resolve(stdout);
          }
        }
      );
      if (cp && cp.stdin) {
        cp.stdin.end(rawData);
      }
    });
  }
}
