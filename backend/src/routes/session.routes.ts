// Session routes - defines all session-related API endpoints
import { Router } from 'express';
import {
  createSession,
  getSession,
  downloadSrt,
  downloadVideoFile,
  updateSession,
  deleteSession,
  runPrompt,
  getAllSessions,
  getPredefinedPrompts,
  getProgress
} from '../controllers/session.controller';

const router = Router();

// Session CRUD operations
router.post('/', createSession);
router.get('/', getAllSessions);
router.get('/:id', getSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

// SRT download
router.get('/:id/srt', downloadSrt);

// Video download
router.get('/:id/video', downloadVideoFile);

// Progress tracking (SSE)
router.get('/:id/progress', getProgress);

// AI prompt processing
router.post('/:id/run-prompt', runPrompt);

// Predefined prompts
router.get('/prompts/list', getPredefinedPrompts);

export default router;
