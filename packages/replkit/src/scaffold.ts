import fsp from "fs/promises";
import path from "path";
import json5 from "json5";

export async function scaffoldTool({ root, toolName, extensionJsonPath }) {
  const code = {
    indexHtml: (name: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/replit.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Extension Tool—${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`,
    mainTsx: (name: string) => `import * as React from 'react';
import { renderExtension } from '@replit/extensions-react';

function Component() {
  return (
    <div>
      Example tool: ${name}
    </div>
  )
}

renderExtension(document.getElementById('root') as Element,
  <Component />
)`,
  };

  const toolFolder = path.join(root, toolName);
  await fsp.mkdir(toolFolder);
  await fsp.writeFile(
    path.join(toolFolder, "index.html"),
    code.indexHtml(toolName),
    { encoding: "utf-8" },
  );
  await fsp.writeFile(
    path.join(toolFolder, "main.tsx"),
    code.mainTsx(toolName),
    { encoding: "utf-8" },
  );
  const extensionJsonString = await fsp.readFile(extensionJsonPath, {
    encoding: "utf-8",
  });
  const manifest = json5.parse(extensionJsonString);
  const newManifest = {
    ...manifest,
    tools: [
      ...(manifest.tools ?? []),
      {
        name: toolName,
        handler: `/${toolName}`,
        icon: "/replit.svg",
      },
    ],
  };
  await fsp.writeFile(
    extensionJsonPath,
    JSON.stringify(newManifest, undefined, 2),
    "utf-8",
  );
}

export async function scaffoldFileHandler({
  root,
  fileHandlerName,
  fileHandlerGlob,
  extensionJsonPath,
}) {
  const code = {
    indexHtml: (name: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/replit.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Extension Tool—${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`,
    mainTsx: (name: string) => `import * as React from 'react';
import { renderExtension } from '@replit/extensions-react';

function Component() {
  return (
    <div>
      Example tool: ${name}
    </div>
  )
}

renderExtension(document.getElementById('root') as Element,
  <Component />
)`,
  };

  const fileHandlerFolder = path.join(root, fileHandlerName);
  await fsp.mkdir(fileHandlerFolder);
  await fsp.writeFile(
    path.join(fileHandlerFolder, "index.html"),
    code.indexHtml(fileHandlerName),
    { encoding: "utf-8" },
  );
  await fsp.writeFile(
    path.join(fileHandlerFolder, "main.tsx"),
    code.mainTsx(fileHandlerName),
    { encoding: "utf-8" },
  );
  const extensionJsonString = await fsp.readFile(extensionJsonPath, {
    encoding: "utf-8",
  });
  const manifest = json5.parse(extensionJsonString);
  const newManifest = {
    ...manifest,
    fileHandlers: [
      ...(manifest.fileHandlers ?? []),
      {
        name: fileHandlerName,
        handler: `/${fileHandlerName}`,
        glob: fileHandlerGlob,
        icon: "/replit.svg",
      },
    ],
  };
  await fsp.writeFile(
    extensionJsonPath,
    JSON.stringify(newManifest, undefined, 2),
    "utf-8",
  );
}

export async function scaffoldBackground({ root, extensionJsonPath }) {
  const code = {
    indexHtml: () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/replit.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Extension Background page</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
`,
    mainTsx: () => `
import * as replit from '@replit/extensions';

async function main() {
  await replit.messages.showConfirm('Hello World');
}

main()
`,
  };

  const extensionJsonString = await fsp.readFile(extensionJsonPath, {
    encoding: "utf-8",
  });
  const manifest = json5.parse(extensionJsonString);

  if (manifest.background?.page) {
    throw new Error("Extension already has a background page");
  }

  const backgroundFolder = path.join(root, "background");
  await fsp.mkdir(backgroundFolder);
  await fsp.writeFile(
    path.join(backgroundFolder, "index.html"),
    code.indexHtml(),
    { encoding: "utf-8" },
  );
  await fsp.writeFile(path.join(backgroundFolder, "main.tsx"), code.mainTsx(), {
    encoding: "utf-8",
  });

  const newManifest = {
    ...manifest,
    background: {
      page: "/background",
    },
  };
  await fsp.writeFile(
    extensionJsonPath,
    JSON.stringify(newManifest, undefined, 2),
    "utf-8",
  );
}
