import { readFile } from "fs";
import { IncomingMessage, Server, ServerResponse } from "http";
import { basename, extname, join } from "path";
import { parse, UrlWithParsedQuery } from "url";
import { promisify } from "util";

import log from "./log";
import DataFetcherFactory from "./datafetcher/DataFetcherFactory";

export default class SimpleServer extends Server {
  basePath: string = process.env.PWD ?? "..";
  fetcherFactory: DataFetcherFactory;

  constructor(port: number, dataFetcherFactory: DataFetcherFactory) {
    super(requestHandler);

    this.fetcherFactory = dataFetcherFactory;

    this.listen(port, () => {
      log.debug(`server is listening on ${port}`);
    });

    async function requestHandler(
      this: SimpleServer,
      req: IncomingMessage,
      res: ServerResponse
    ): Promise<void> {
      if (!req.url) {
        return;
      }
      try {
        const url: UrlWithParsedQuery = parse(req.url, true);
        await this.handleRoute(url, res);
      } catch (e) {
        this.handleError(res, e); // 404
      }
    }
  }

  handleRoute(url: UrlWithParsedQuery, res: ServerResponse): Promise<void> {
    const path = url.pathname;
    let ret;

    if (path === "/") {
      ret = this.requestFile(res, "/resources/html/index.html");
    } else if (path === "/mapboxToken") {
      ret = this.requestFile(res, "/.accessToken.txt");
    } else if (path === "/favicon.ico") {
      ret = this.requestFile(res, "/resources/img/favicon.png");
    } else if (path && path.startsWith("/resources/")) {
      ret = this.requestFile(res, path);
    } else if (path && path.startsWith("/data/")) {
      ret = this.requestData(res, url);
    } else if (path === "/serverInfo") {
      ret = this.requestServerInfo(res);
    } else {
      throw new Error(`${path} not found`);
    }
    return ret;
  }

  async requestFile(res: ServerResponse, path: string): Promise<void> {
    const ext = extname(path);
    const filePath = join(this.basePath, path);
    let contentType;

    switch (ext) {
      case ".html":
        contentType = "text/html";
        break;
      case ".js":
        contentType = "text/javascript";
        break;
      case ".css":
        contentType = "text/css";
        break;
      default:
        contentType = "text/plain";
        break;
    }

    const content = await promisify(readFile)(filePath);
    res.writeHead(200, { "Content-Type": `${contentType}; charset=utf-8` });
    res.end(content, "utf-8");
  }

  async requestData(
    res: ServerResponse,
    url: UrlWithParsedQuery
  ): Promise<void> {
    const { pathname, query } = url;
    if( !pathname ) {
      throw new Error("No fetcher path provided!");
    }
    const ext = extname(pathname);
    const type = basename(pathname, ext);
    const fetcher = this.fetcherFactory.get(type);

    if (fetcher) {
      const data = await fetcher.fetch( query, ext );
      res.writeHead(200, { "Content-Type": data.type });
      res.end(data.data);
    } else {
      throw new Error(`No fetcher found for ${type}`);
    }
  }

  async requestServerInfo(res: ServerResponse): Promise<void> {
    const ret = {
      memory: process.memoryUsage()
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(ret));
  }

  private handleError(res: ServerResponse, error: NodeJS.ErrnoException): void {
    log.error(error);

    if (error.code === "ENOENT" || error.message.endsWith("not found")) {
      res.writeHead(404);
      res.end("404 not found");
    } else {
      res.writeHead(500);
      res.end("500 internal server error");
    }
  }
}
