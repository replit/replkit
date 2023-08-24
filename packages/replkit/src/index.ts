#!/usr/bin/env node
import { fileURLToPath, parse as urlParse } from "url";
import { createServer, InlineConfig, build } from "vite";
import {
  htmlFallbackMiddleware,
  trailingSlashMiddleware,
} from "./htmlFallbackMiddleware";
import { indexHtmlMiddleware } from "./indexHtmlMiddleware";
import fs from "fs";
import fsp from "fs/promises";
import cac from "cac";
import path from "path";
import readline from "readline";
import json5 from "json5";
import { scaffoldTool, scaffoldFileHandler, scaffoldBackground } from "./scaffold";

function resolvePath(userPath) {
  return path.resolve(process.cwd(), userPath);
}
const cli = cac("replkit");

async function getPages(
  directoryPath: string,
): Promise<Array<{ name: string; path: string }>> {
  const pages: Array<{ name: string; path: string }> = [];
  const files = await fsp.readdir(directoryPath);

  for (const file of files) {
    const isDirectory = (
      await fsp.stat(path.join(directoryPath, file))
    ).isDirectory();

    if (!isDirectory) {
      continue;
    }

    const indexHtmlPath = path.join(directoryPath, file, "index.html");
    const containsIndexHtml = (await fsp.stat(indexHtmlPath)).isFile();

    if (!containsIndexHtml) {
      continue;
    }

    pages.push({ name: file, path: indexHtmlPath });
  }

  return pages;
}

async function getConfiguration(homeDir?: string) {
  const homeDirectory = homeDir ? resolvePath(homeDir) : process.cwd();
  const root = path.join(homeDirectory, "src");
  const publicDir = homeDirectory + "/public";
  const outDir = `${homeDirectory}/dist`;
  const pages = await getPages(root);
  const config: InlineConfig = {
    root,
    publicDir,
    appType: "custom",
    server: {
      host: "0.0.0.0",
      port: 8080,
      watch: {},
      // strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      port: 8080,
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: pages.reduce(
          (acc, val) => ({ ...acc, [val.name]: val.path }),
          {},
        ),
      },
    },
    logLevel: "info",
  };

  const extensionJsonPath = `${homeDirectory}/extension.json`;

  return {
    homeDirectory,
    root,
    publicDir,
    outDir,
    config,
    extensionJsonPath,
  };
}

cli.option('-C, --home-dir <homeDir>', 'The extension\'s home directory. Assumes the current directory if not provided', {default: process.cwd()});

cli
  .command("dev", "Run the replkit dev server")
  .action(async (options) => {
    const { config, homeDirectory, publicDir, root, extensionJsonPath } =
      await getConfiguration(options.homeDir);

    console.log(`Running in ${homeDirectory}`);

    const server = await createServer(config);

    // serve extension.json using config file
    server.middlewares.use("/extension.json", (req, res) => {
      const content = fs.readFileSync(extensionJsonPath, "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(content);
    });

    // If a /directory is requested, redirect to /directory/ (with the trailing slash) to preserve web behavior
    server.middlewares.use(trailingSlashMiddleware(root, publicDir));

    // If requested file doesn't exist, fall back to index.html
    server.middlewares.use(htmlFallbackMiddleware(root, publicDir, false));

    // Process and serve index.html
    server.middlewares.use(indexHtmlMiddleware(server));

    // Return 404 if not found
    server.middlewares.use(function vite404Middleware(_, res) {
      res.statusCode = 404;
      res.end();
    });

    console.log("Starting server...");
    await server.listen();
    console.log(
      `Replit extension dev server is active. Visit Extension Devtools and click on 'Load Locally'`,
    );

    fs.watchFile(
      extensionJsonPath,
      { persistent: true, interval: 1000 },
      (eventType, filename) => {
        // The  is the Replit prompt symbol
        console.log(
          " extension.json changed, you may need to reload your extension to see changes",
        );
      },
    );
  });

cli
  .command("build", "Build extension")
  .action(async (options) => {
    const {
      config,
      homeDirectory,
      publicDir,
      root,
      extensionJsonPath,
      outDir,
    } = await getConfiguration(options.homeDir);
    const output = await build(config);
    // TODO: figure out if there's a more idiomatic way to do this with vite / rollup
    fs.copyFileSync(extensionJsonPath, `${outDir}/extension.json`);
  });

cli
  .command("add <feature>", "Add a feature to your extension")
  .action(async (feature, options) => {
    const {
      config,
      homeDirectory,
      publicDir,
      root,
      extensionJsonPath,
      outDir,
    } = await getConfiguration(options.homeDir);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const questionAsync = (prompt) => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    if (feature === "tool") {
      const toolName = (await questionAsync(
        "What is this tool called?\n",
      )) as string;
      await scaffoldTool({ root, toolName, extensionJsonPath });
    } else if (feature === "file-handler") {
      const fileHandlerName = (await questionAsync(
        "What is this file-handler called?\n",
      )) as string;
      const fileHandlerGlob = (await questionAsync(
        "What files does this file-handler open?\n",
      )) as string;

      await scaffoldFileHandler({
        root,
        fileHandlerName,
        fileHandlerGlob,
        extensionJsonPath,
      });
    } else if (feature === "background") {
      await scaffoldBackground({ root, extensionJsonPath });
    } else {
      console.log(`Unknown feature: ${feature}`);
    }

    rl.close();
  });

cli.help();

async function main() {
  try {
    const res = await cli.parse();

    // if you run the CLI without any args
    if (cli.rawArgs.length === 2) {
      cli.outputHelp();
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
    cli.outputHelp();
  }
}

main();
