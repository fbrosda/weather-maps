export default abstract class DataFetcher {
  baseurl: string;

  constructor() {
    this.baseurl = "";
  }

  abstract fetchPng(param: object): object;
  abstract fetchJson(param: object): object;
}
