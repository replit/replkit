import { fileURLToPath, parse as urlParse } from 'url';
import { createServer, InlineConfig } from 'vite';
import { htmlFallbackMiddleware, trailingSlashMiddleware } from './htmlFallbackMiddleware';
import { indexHtmlMiddleware } from './indexHtmlMiddleware';
import fs from 'fs';

async function main() {
  const homeDirectory = process.cwd();
  console.log('running in ' + homeDirectory)
  const root = process.cwd() + '/src';
  const publicDir = homeDirectory + '/public';
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
      outDir: `${homeDirectory}/dist`,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'tool': 'src/tool/index.html'
        }
      }
    },
    logLevel: 'info',
  }

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
}

main()