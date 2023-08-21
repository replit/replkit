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
          'tool': 'src/tool/index.html',
        }
      }
    },
    logLevel: 'info',
  }

  return  {
    homeDirectory,
    root,
    publicDir,
    outDir,
    config,
  }
}

// TODO figure out why this takes forever to run
cli.command('dev <dir>', 'Run the replkit dev server').action(async (homeDir, options) => {
  console.log('running replkit dev server...');
  console.log('options', options)

  const {config, homeDirectory, publicDir, root} = getConfiguration(homeDir);

  console.log(`Running in ${homeDirectory}`)

  const server = await createServer(config);

    // serve extension.json using config file
    server.middlewares.use('/extension.json', (req, res) => {
      const content = fs.readFileSync(`${homeDirectory}/extension.json`, 'utf-8');
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
});

cli.command('build', 'Build extension').action(async (options) => {
  await build(config)
    // TODO: figure out if there's a more idiomatic way to do this with vite / rollup
    fs.copyFileSync('extension.json', `${outDir}/extension.json`)
})

cli.help();
cli.parse();