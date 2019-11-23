import { readFile } from "fs";
import { IncomingMessage, Server, ServerResponse } from "http";
import { extname } from "path";
import { parse, UrlWithParsedQuery } from "url";
import { promisify } from "util";

import log from "./log";

export default class SimpleServer extends Server {
  constructor(port: number) {
    super(requestHandler);

    this.listen(port, () => {
      log.debug(`server is listening on ${port}`);
    });
  }
}

function requestHandler(req: IncomingMessage, res: ServerResponse): void {
  const url: UrlWithParsedQuery = parse(req.url, true);
  const path = url.pathname;

  if (path === "/") {
    requestFile(req, res, "/resources/html/index.html");
  } else if (path === "/mapboxToken") {
    requestFile(req, res, "/accessToken.txt");
  } else if (path.startsWith("/resources/")) {
    requestFile(req, res, path);
  } else if (path === "/serverInfo") {
    requestServerInfo.call(this, req, res);
  } else {
    handleError(res, new Error(`${path} not found`)); // 404
  }
}

async function requestFile(
  req: IncomingMessage,
  res: ServerResponse,
  reqPath: string
): Promise<void> {
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
    handleError(res, e);
  }
}

async function requestServerInfo(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const ret = {
      memory: process.memoryUsage()
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(ret));
  } catch (e) {
    handleError(res, e);
  }
}

function handleError(res: ServerResponse, error: NodeJS.ErrnoException): void {
  log.error(error);

  if (error.code === "ENOENT" || error.message.endsWith("not found")) {
    res.writeHead(404);
    res.end("404 not found");
  } else {
    res.writeHead(500);
    res.end("500 internal server error");
  }
}
