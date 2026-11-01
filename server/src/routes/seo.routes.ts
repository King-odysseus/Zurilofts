import { Router } from 'express';
import { buildRobots, buildSitemap } from '../services/seo.service.js';
import { requestOrigin } from '../utils/publicUrl.js';

const router = Router();

// Crawlers fetch both of these on every visit. A one hour cache keeps them
// cheap for us while a newly published listing still gets picked up quickly.
const CACHE_FOR_AN_HOUR = 'public, max-age=3600';

router.get('/robots.txt', (req, res) => {
  res.type('text/plain').set('Cache-Control', CACHE_FOR_AN_HOUR).send(buildRobots(requestOrigin(req)));
});

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const xml = await buildSitemap(requestOrigin(req));
    res.type('application/xml').set('Cache-Control', CACHE_FOR_AN_HOUR).send(xml);
  } catch (err) {
    next(err);
  }
});

export default router;
