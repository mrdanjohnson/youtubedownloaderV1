// Settings routes - prompts and LLM configuration endpoints
import { Router } from 'express';
import {
  getAllPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  getLlmSettings,
  updateLlmSettings
} from '../controllers/settings.controller';

const router = Router();

// Prompt management
router.get('/prompts', getAllPrompts);
router.post('/prompts', createPrompt);
router.put('/prompts/:id', updatePrompt);
router.delete('/prompts/:id', deletePrompt);

// LLM configuration
router.get('/llm', getLlmSettings);
router.put('/llm', updateLlmSettings);

export default router;
