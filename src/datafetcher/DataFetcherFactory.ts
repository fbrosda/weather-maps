import DataFetcher from "./DataFetcher";
import WindDataFetcher from "./WindDataFetcher";

export default class DataFetcherFactory {
  map: Map<string, DataFetcher>;

  constructor() {
    this.map = new Map();
  }

  get(id: string): DataFetcher | undefined {
    if (this.map.has(id)) {
      return this.map.get(id);
    } else {
      const fetcher = this.createFetcher(id);
      if (fetcher) {
        this.map.set(id, fetcher);
        return fetcher;
      }
    }
    return;
  }

  createFetcher(id: string): DataFetcher | undefined {
    if (id === "wind") {
      return new WindDataFetcher();
    }
    return;
  }
}
