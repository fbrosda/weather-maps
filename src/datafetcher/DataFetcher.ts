export default abstract class DataFetcher {
  baseurl: string;

  constructor() {
    this.baseurl = "";
  }

  abstract fetch(param: object): object;
}
