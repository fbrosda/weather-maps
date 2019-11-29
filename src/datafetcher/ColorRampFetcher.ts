import { DataFetcher, ReturnData } from "./DataFetcher";
import { PNG } from "pngjs";

type IndexColor = [number, string];
const defaultRampColors: IndexColor[] = [
  [0.0, "#3288bd"],
  [0.1, "#66c2a5"],
  [0.2, "#abdda4"],
  [0.3, "#e6f598"],
  [0.4, "#fee08b"],
  [0.5, "#fdae61"],
  [0.6, "#f46d43"],
  [1.0, "#d53e4f"]
];

type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export default class ColorRampFetcher extends DataFetcher {
  constructor() {
    super();

    this.type2Method.set(".png", this.fetchPng);
  }

  async fetchPng(param: object): Promise<ReturnData> {
    const height = 256;
    const png = new PNG({
      colorType: 2,
      filterType: 4,
      width: 1,
      height: height
    });
    const colors = this.parseQuery(param);

    for (let y = 0; y < height; y++) {
      const step = y / height;
      const next = this.getBracket(colors, step);

      const min = next[0][0];
      const max = next[1][0];
      const colMin = this.hexToRGBA(next[0][1]);
      const colMax = this.hexToRGBA(next[1][1]);
      const val = (step - min) / (max - min);

      const i = y * 4;
      png.data[i] = colMin.r + val * (colMax.r - colMin.r);
      png.data[i + 1] = colMin.g + val * (colMax.g - colMin.g);
      png.data[i + 2] = colMin.b + val * (colMax.b - colMin.b);
      png.data[i + 3] = colMin.a + val * (colMax.a - colMin.a);
    }
    const data = PNG.sync.write(png, { colorType: 2, filterType: 4 });
    return { data: data, type: "image/png" };
  }

  private parseQuery(param: { colors?: string }): IndexColor[] {
    if (param.colors) {
      const colors = param.colors.split(",").map(arg => arg.split(":"));
      if (colors.length) {
        const tmp: IndexColor[] = colors.map(arg => [
          parseFloat(arg[0]) ?? 0,
          arg[1]
        ]);
        return tmp.sort(sortColors);
      }
    }
    return defaultRampColors.sort(sortColors);

    function sortColors(a: IndexColor, b: IndexColor): number {
      return a[0] - b[0];
    }
  }

  private getBracket(array: IndexColor[], val: number): IndexColor[] {
    let i = 0;
    while (array[i++][0] <= val);

    i -= 1;
    return [array[i - 1], array[i]];
  }

  private hexToRGBA(color: string): RGBA {
    const [r, g, b] = color
      .match(/^#([0-9a-f]{2,2})([0-9a-f]{2,2})([0-9a-f]{2,2})$/)
      ?.slice(1) ?? ["0", "0", "0"];
    return {
      r: parseInt(r, 16),
      g: parseInt(g, 16),
      b: parseInt(b, 16),
      a: 255
    };
  }
}
