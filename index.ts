import { fileURLToPath } from 'url';
import { createServer, build, preview, InlineConfig } from 'vite';

async function main() {
  const config: InlineConfig = {
    root: __dirname + '/src',
    publicDir: __dirname + '/public',
    appType: "mpa",
    server: {
      host: '0.0.0.0',
      port: 8080,
    },
    preview: {
      host: '0.0.0.0',
      port: 8080,
    },
    build: {
      outDir: `${__dirname}/dist`,
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
  server.middlewares.use((req, res, next) => {
    console.log(req.url)
    next();
  })
  await server.listen();

  // build(config);

  // await server.printUrls()
}

main()