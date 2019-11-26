export enum ShaderType {
  VERTEX = "vert",
  FRAGMENT = "frag"
}

export function fetch<T>(url: string, method = "GET"): Promise<T> {
  const request = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    request.onreadystatechange = onReady;
    request.open(method || "GET", url, true);
    request.send();

    function onReady(): void {
      if (request.readyState !== 4) {
        return;
      }

      if (request.status >= 200 && request.status < 300) {
        resolve(request.response);
      } else {
        reject({
          status: request.status,
          statusText: request.statusText
        });
      }
    }
  });
}
