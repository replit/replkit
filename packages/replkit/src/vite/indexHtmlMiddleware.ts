import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ViteDevServer, SendOptions } from "vite";
import os from "node:os";
import { IncomingMessage, ServerResponse } from "node:http";
import getEtag from "etag";
// import type { IndexHtmlTransformHook } from '../../plugins/html'
// import {
//   addToHTMLProxyCache,
//   applyHtmlTransforms,
//   assetAttrsConfig,
//   getAttrKey,
//   getScriptInfo,
//   htmlEnvHook,
//   nodeIsElement,
//   overwriteAttrValue,
//   postImportMapHook,
//   preImportMapHook,
//   resolveHtmlTransforms,
//   traverseHtml,
// } from '../../plugins/html'
// import type { ResolvedConfig, ViteDevServer } from '../..'
// import { send } from '../send'
// import { CLIENT_PUBLIC_PATH, FS_PREFIX } from '../../constants'
// import {
//   ensureWatchedFile,
//   fsPathFromId,
//   injectQuery,
//   isJSRequest,
//   joinUrlSegments,
//   normalizePath,
//   processSrcSetSync,
//   stripBase,
//   unwrapId,
//   wrapId,
// } from '../../utils'
// import { ERR_CLOSED_SERVER } from '../pluginContainer'
// import { ERR_OUTDATED_OPTIMIZED_DEP } from '../../plugins/optimizedDeps'
// import { isCSSRequest } from '../../plugins/css'
// import { checkPublicFile } from '../../plugins/asset'
// import { getCodeWithSourcemap, injectSourcesContent } from '../sourcemap'

interface AssetNode {
  start: number;
  end: number;
  code: string;
}

const postfixRE = /[?#].*$/s;
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, "");
}

export const FS_PREFIX = `/@fs/`;
const VOLUME_RE = /^[A-Z]:/i;

export function normalizePath(id: string): string {
  const isWindows = os.platform() === "win32";
  function slash(p: string): string {
    const windowsSlashRE = /\\/g;
    return p.replace(windowsSlashRE, "/");
  }

  return path.posix.normalize(isWindows ? slash(id) : id);
}

export function fsPathFromId(id: string): string {
  const fsPath = normalizePath(
    id.startsWith(FS_PREFIX) ? id.slice(FS_PREFIX.length) : id,
  );
  return fsPath[0] === "/" || fsPath.match(VOLUME_RE) ? fsPath : `/${fsPath}`;
}

function getHtmlFilename(url: string, server: ViteDevServer) {
  if (url.startsWith(FS_PREFIX)) {
    return decodeURIComponent(fsPathFromId(url));
  } else {
    return decodeURIComponent(
      normalizePath(path.join(server.config.root, url.slice(1))),
    );
  }
}

export function indexHtmlMiddleware(
  server: ViteDevServer,
): Connect.NextHandleFunction {
  // Keep the named function. The name is visible in debug logs via `DEBUG=connect:dispatcher ...`
  return async function viteIndexHtmlMiddleware(req, res, next) {
    if (res.writableEnded) {
      return next();
    }

    const url = req.url && cleanUrl(req.url);
    // htmlFallbackMiddleware appends '.html' to URLs
    if (url?.endsWith(".html") && req.headers["sec-fetch-dest"] !== "script") {
      const filename = getHtmlFilename(url, server);
      if (fs.existsSync(filename)) {
        try {
          let html = await fsp.readFile(filename, "utf-8");
          html = await server.transformIndexHtml(url, html, req.originalUrl);
          return send(req, res, html, "html", {
            headers: server.config.server.headers,
          });
        } catch (e) {
          return next(e);
        }
      }
    }
    next();
  };
}

const alias: Record<string, string | undefined> = {
  js: "application/javascript",
  css: "text/css",
  html: "text/html",
  json: "application/json",
};

export function send(
  req: IncomingMessage,
  res: ServerResponse,
  content: string | Buffer,
  type: string,
  options: SendOptions,
): void {
  const {
    etag = getEtag(content, { weak: true }),
    cacheControl = "no-cache",
    headers,
    map,
  } = options;

  if (res.writableEnded) {
    return;
  }

  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  res.setHeader("Content-Type", alias[type] || type);
  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("Etag", etag);

  if (headers) {
    for (const name in headers) {
      res.setHeader(name, headers[name]!);
    }
  }

  // TODO: inject source map reference
  // if (map && map.mappings) {
  //   if (type === 'js' || type === 'css') {
  //     content = getCodeWithSourcemap(type, content.toString(), map)
  //   }
  // }

  res.statusCode = 200;
  res.end(content);
  return;
}
