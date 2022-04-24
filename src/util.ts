import * as https from "https";
import * as http from "http";
import { promises as fs } from "fs";

export function getContent(url: string): Promise<Buffer> {
  return new Promise(getContentNow);

  function getContentNow(
    resolve: (arg: Buffer) => void,
    reject: (err: Error) => void
  ): void {
    const lib = url.startsWith("https") ? https : http;
    const request = lib.get(url, handleResponse);

    request.on("error", (err) => reject(err));

    function handleResponse(response: http.IncomingMessage): void {
      const statusCode =
        response && response.statusCode != null ? response.statusCode : -1;
      if (statusCode < 200 || statusCode > 299) {
        reject(
          new Error("Failed to load page, status code: " + response.statusCode)
        );
      }

      const body: Buffer[] = [];
      response.on("data", (chunk) => body.push(chunk));
      response.on("end", () => resolve(Buffer.concat(body)));
    }
  }
}

export async function ensureDir(path: string, mask = 0o755): Promise<void> {
  try {
    await fs.mkdir(path, mask);
  } catch (e: any) {
    if (e.code !== "EEXIST") {
      throw e;
    }
  }
}
