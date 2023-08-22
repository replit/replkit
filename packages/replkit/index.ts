#!/usr/bin/env node
import { fileURLToPath, parse as urlParse } from 'url';
import { createServer, InlineConfig, build } from 'vite';
import { htmlFallbackMiddleware, trailingSlashMiddleware } from './htmlFallbackMiddleware';
import { indexHtmlMiddleware } from './indexHtmlMiddleware';
import fs from 'fs';
import cac from 'cac';
import path from 'path'

function resolvePath(userPath) {
  return path.resolve(process.cwd(), userPath);
}
const cli = cac('replkit');

function getConfiguration(homeDir: string) {
  const homeDirectory = homeDir ? resolvePath(homeDir) : process.cwd()
  const root = path.join(homeDirectory, 'src');
  console.log(root);
  const publicDir = homeDirectory + '/public';
  const outDir = `${homeDirectory}/dist`
  const config: InlineConfig = {
    root,
    publicDir,
    appType: "custom",
    server: {
      host: '0.0.0.0',
      port: 8080,
      watch: {},
      // strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'tool': homeDirectory + '/src/tool/index.html',
        }
      }
    },
    logLevel: 'info',
  }

  const extensionJsonPath = `${homeDirectory}/extension.json`

  return {
    homeDirectory,
    root,
    publicDir,
    outDir,
    config,
    extensionJsonPath
  }
}

cli.command('dev <dir>', 'Run the replkit dev server').action(async (homeDir, options) => {
  const { config, homeDirectory, publicDir, root, extensionJsonPath } = getConfiguration(homeDir);

  console.log(`Running in ${homeDirectory}`)

  const server = await createServer(config);

  // serve extension.json using config file
  server.middlewares.use('/extension.json', (req, res) => {
    const content = fs.readFileSync(extensionJsonPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(content);
  });

  // If a /directory is requested, redirect to /directory/ (with the trailing slash) to preserve web behavior
  server.middlewares.use(trailingSlashMiddleware(root, publicDir))

  // If requested file doesn't exist, fall back to index.html
  server.middlewares.use(htmlFallbackMiddleware(root, publicDir, false))

  // Process and serve index.html
  server.middlewares.use(indexHtmlMiddleware(server))

  // Return 404 if not found
  server.middlewares.use(function vite404Middleware(_, res) {
    res.statusCode = 404
    res.end()
  })

  console.log('Starting server...')
  await server.listen();
  console.log(`Replit extension dev server is active. Visit Extension Devtools and click on 'Load Locally'`);

  fs.watchFile(extensionJsonPath, { persistent: true, interval: 1000 }, (eventType, filename) => {
    // The  is the Replit prompt symbol
    console.log(' extension.json changed, you may need to reload your extension to see changes')
  });
});

cli.command('build <dir>', 'Build extension').action(async (homeDir, options) => {
  const { config, homeDirectory, publicDir, root, extensionJsonPath, outDir } = getConfiguration(homeDir);
  const output = await build(config);
  // TODO: figure out if there's a more idiomatic way to do this with vite / rollup
  fs.copyFileSync(extensionJsonPath, `${outDir}/extension.json`)
})

cli.help();

async function main() {
  try {
    const res = await cli.parse();
    
    // if you run the CLI without any args
    if (cli.rawArgs.length === 2) {
      cli.outputHelp();
    }
  } catch (e) {
    console.log(`Error: ${e.message}`)
    cli.outputHelp();
  }
}

main();