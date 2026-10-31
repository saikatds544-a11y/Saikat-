import 'dotenv/config';
import http from 'http';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './src/server/apiRouter.ts';
import { getStorefrontBundle } from './src/server/repository.ts';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Serve uploaded product/logo images
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Dynamic SEO Sitemap.xml
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = (
        process.env.APP_URL || `${req.protocol}://${req.get('host')}`
      ).replace(/\/$/, '');
      const { categories, products } = await getStorefrontBundle();
      const today = new Date().toISOString().split('T')[0];

      const urls = [
        `<url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        `<url><loc>${baseUrl}/track-order</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
        ...categories.map(
          (c) =>
            `<url><loc>${baseUrl}/category/${encodeURIComponent(c.slug)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
        ),
        ...products.map(
          (p) =>
            `<url><loc>${baseUrl}/product/${encodeURIComponent(p.slug)}</loc><lastmod>${(p.updatedAt || today).split('T')[0]}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`
        ),
      ];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`;

      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.send(xml);
    } catch {
      res.status(500).send('Error generating sitemap');
    }
  });

  // Dynamic SEO Robots.txt (explicitly disallows private /admin route)
  app.get('/robots.txt', (req, res) => {
    const baseUrl = (
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`
    ).replace(/\/$/, '');
    const robots = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      'Disallow: /api/admin',
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join('\n');
    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.send(robots);
  });

  // Mount API routes
  app.use('/api', apiRouter);

  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (!isProd) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use('/src/assets', express.static(path.resolve(process.cwd(), 'src', 'assets')));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Maa Lakshmi Alankar server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
