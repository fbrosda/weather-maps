import DataFetcher from "./DataFetcher";
import { PNG } from "pngjs";

const defaultRampColors: [number, string][] = [
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
  }

  fetchJson(): object {
    throw new Error("Function not supported");
  }

  fetchPng(): Buffer {
    const height = 256;
    const png = new PNG({
      colorType: 2,
      filterType: 4,
      width: 1,
      height: height
    });
    const colors = defaultRampColors.sort((a, b) => a[0] - b[0]);

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
    return PNG.sync.write(png, { colorType: 2, filterType: 4 });
  }

  private getBracket(
    array: [number, string][],
    val: number
  ): [number, string][] {
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
