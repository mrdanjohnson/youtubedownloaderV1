// Main routes index - combines all route modules
import { Router } from 'express';
import sessionRoutes from './session.routes';
import settingsRoutes from './settings.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'yt-insight-backend'
  });
});

// API version prefix
const apiRouter = Router();

// Mount route modules
apiRouter.use('/session', sessionRoutes);
apiRouter.use('/settings', settingsRoutes);

// Mount API router with /api prefix
router.use('/api', apiRouter);

export default router;
