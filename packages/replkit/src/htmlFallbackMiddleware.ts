import fs from "node:fs";
import path from "node:path";
import history from "connect-history-api-fallback";
import type { NextHandleFunction } from "connect";
import { parse as urlParse } from "url";

function fileExists(path: string) {
  return fs.existsSync(path) && fs.statSync(path).isFile();
}

function dirExists(path: string) {
  return fs.existsSync(path) && fs.statSync(path).isDirectory();
}

export function trailingSlashMiddleware(root: string, publicDir: string) {
  return function trailingSlashDirectoryRedirectMiddleware(req, res, next) {
    const url = urlParse(req.url);
    const fsPath = path.join(root, url.pathname!);
    console.log({ pathname: url.pathname });
    if (dirExists(fsPath) && !url.pathname!.endsWith("/")) {
      // Include query parameters in the redirect
      const newLocation = url.pathname! + "/" + (url.search ? url.search : "");
      res.writeHead(302, { Location: newLocation });
      res.end();

      return;
    }

    next();
  };
}

export function htmlFallbackMiddleware(
  root: string,
  publicDir: string,
  spaFallback: boolean,
): NextHandleFunction {
  const historyHtmlFallbackMiddleware = history({
    // support /dir/ without explicit index.html
    rewrites: [
      {
        // from: /^(?!.*\.html$).*/, // this is any path that doesn't end with .html
        from: /.*/, // all paths
        to({ parsedUrl, request }: any) {
          // 1. if the requested path exists in public and it is a file, return that
          const publicPath = path.join(publicDir, parsedUrl.pathname);
          if (fileExists(publicPath)) {
            return parsedUrl.pathname;
          }

          // 2. if it exists in root and is a file, return that
          const fsPath = path.join(root, parsedUrl.pathname);
          if (fileExists(fsPath)) {
            return parsedUrl.pathname;
          }

          // 3. if it exists in root, and is a folder, try returning it + /index.html
          if (dirExists(fsPath)) {
            // console.log(request)
            const indexFileUrl = path.join(parsedUrl.pathname, "index.html");
            // console.log({ indexFileUrl, file: path.join(root, indexFileUrl) });
            if (fileExists(path.join(root, indexFileUrl))) {
              return indexFileUrl;
            }
          }

          // idk, return the same URL, kick it down to the 404 middleware
          return request.url;
        },
      },
    ],
  });

  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return function viteHtmlFallbackMiddleware(req, res, next) {
    return historyHtmlFallbackMiddleware(req, res, next);
  };
}
