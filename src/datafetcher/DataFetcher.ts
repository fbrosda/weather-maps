export default abstract class DataFetcher {
  baseurl: string = "";

  abstract fetchPng(param: object): object;
  abstract fetchJson(param: object): object;
}
