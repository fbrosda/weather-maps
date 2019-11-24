import { readFile } from "fs";
import { IncomingMessage, Server, ServerResponse } from "http";
import { basename, extname } from "path";
import { parse, UrlWithParsedQuery } from "url";
import { promisify } from "util";

import log from "./log";
import DataFetcherFactory from "./datafetcher/DataFetcherFactory";
import DataFetcher from "./datafetcher/DataFetcher";

export default class SimpleServer extends Server {
  fetcherFactory: DataFetcherFactory;

  constructor(port: number, dataFetcherFactory: DataFetcherFactory) {
    super(requestHandler);

    this.fetcherFactory = dataFetcherFactory;

    this.listen(port, () => {
      log.debug(`server is listening on ${port}`);
    });
  }

  async requestFile(res: ServerResponse, reqPath: string): Promise<void> {
    const filePath = "." + reqPath;
    const ext = extname(filePath);
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

    try {
      const content = await promisify(readFile)(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    } catch (e) {
      this.handleError(res, e);
    }
  }

  async requestData(
    res: ServerResponse,
    url: UrlWithParsedQuery
  ): Promise<void> {
    const { pathname, query } = url;
    const type = basename(pathname ?? "").split(".")[0];
    const ext = extname(pathname ?? "");
    const fetcher: DataFetcher | undefined = this.fetcherFactory.get(type);

    if (fetcher) {
      if (ext === ".png") {
        const data = await fetcher.fetchPng(query);
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(data);
      } else {
        const data = await fetcher.fetchJson(query);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
      }
    } else {
      this.handleError(res, new Error("No fetcher found"));
    }
  }

  async requestServerInfo(res: ServerResponse): Promise<void> {
    try {
      const ret = {
        memory: process.memoryUsage()
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(ret));
    } catch (e) {
      this.handleError(res, e);
    }
  }

  protected handleError(
    res: ServerResponse,
    error: NodeJS.ErrnoException
  ): void {
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

function requestHandler(
  this: SimpleServer,
  req: IncomingMessage,
  res: ServerResponse
): void {
  if (!req.url) {
    return;
  }
  const url: UrlWithParsedQuery = parse(req.url, true);
  const path = url.pathname;

  if (path === "/") {
    this.requestFile(res, "/resources/html/index.html");
  } else if (path === "/mapboxToken") {
    this.requestFile(res, "/accessToken.txt");
  } else if (path && path.startsWith("/resources/")) {
    this.requestFile(res, path);
  } else if (path && path.startsWith("/data/")) {
    this.requestData(res, url);
  } else if (path === "/serverInfo") {
    this.requestServerInfo(res);
  } else {
    this.handleError(res, new Error(`${path} not found`)); // 404
  }
}
