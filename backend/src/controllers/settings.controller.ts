// Settings controller - handles prompts and LLM configuration
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreatePromptRequest, UpdatePromptRequest, UpdateLlmSettingsRequest, LlmSettings, ErrorResponse } from '../types';

const prisma = new PrismaClient();

/**
 * Get all prompts
 * GET /api/settings/prompts
 */
export async function getAllPrompts(req: Request, res: Response): Promise<void> {
  try {
    const prompts = await prisma.prompt.findMany({
      orderBy: [
        { is_default: 'desc' },
        { created_at: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error: unknown) {
    console.error('[SettingsController] Error fetching prompts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prompts',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Create new prompt
 * POST /api/settings/prompts
 */
export async function createPrompt(req: Request, res: Response): Promise<void> {
  try {
    const { name, description, prompt }: CreatePromptRequest = req.body;

    if (!name || !description || !prompt) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, prompt'
      } as ErrorResponse);
      return;
    }

    const newPrompt = await prisma.prompt.create({
      data: {
        name,
        description,
        prompt,
        is_default: false
      }
    });

    res.status(201).json({
      success: true,
      data: newPrompt
    });
  } catch (error: unknown) {
    console.error('[SettingsController] Error creating prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to create prompt',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Update existing prompt
 * PUT /api/settings/prompts/:id
 */
export async function updatePrompt(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates: UpdatePromptRequest = req.body;

    // Check if prompt exists
    const existingPrompt = await prisma.prompt.findUnique({
      where: { id }
    });

    if (!existingPrompt) {
      res.status(404).json({
        success: false,
        error: 'Prompt not found'
      } as ErrorResponse);
      return;
    }

    // Don't allow editing default prompts
    if (existingPrompt.is_default) {
      res.status(403).json({
        success: false,
        error: 'Cannot edit default prompts'
      } as ErrorResponse);
      return;
    }

    const updatedPrompt = await prisma.prompt.update({
      where: { id },
      data: updates
    });

    res.json({
      success: true,
      data: updatedPrompt
    });
  } catch (error: unknown) {
    console.error('[SettingsController] Error updating prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to update prompt',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Delete prompt
 * DELETE /api/settings/prompts/:id
 */
export async function deletePrompt(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if prompt exists
    const existingPrompt = await prisma.prompt.findUnique({
      where: { id }
    });

    if (!existingPrompt) {
      res.status(404).json({
        success: false,
        error: 'Prompt not found'
      } as ErrorResponse);
      return;
    }

    // Don't allow deleting default prompts
    if (existingPrompt.is_default) {
      res.status(403).json({
        success: false,
        error: 'Cannot delete default prompts'
      } as ErrorResponse);
      return;
    }

    await prisma.prompt.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  } catch (error: unknown) {
    console.error('[SettingsController] Error deleting prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to delete prompt',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Get LLM settings
 * GET /api/settings/llm
 */
export async function getLlmSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: ['llm_model', 'llm_max_tokens', 'llm_temperature']
        }
      }
    });

    const llmSettings: LlmSettings = {
      model: settings.find(s => s.key === 'llm_model')?.value || 'gpt-3.5-turbo',
      maxTokens: parseInt(settings.find(s => s.key === 'llm_max_tokens')?.value || '2000'),
      temperature: parseFloat(settings.find(s => s.key === 'llm_temperature')?.value || '0.7')
    };

    res.json({
      success: true,
      data: llmSettings
    });
  } catch (error: unknown) {
    console.error('[SettingsController] Error fetching LLM settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM settings',
      details: errorMessage
    } as ErrorResponse);
  }
}

/**
 * Update LLM settings
 * PUT /api/settings/llm
 */
export async function updateLlmSettings(req: Request, res: Response): Promise<void> {
  try {
    const { model, maxTokens, temperature }: UpdateLlmSettingsRequest = req.body;

    const updates: Array<{ key: string; value: string }> = [];

    if (model !== undefined) {
      updates.push({ key: 'llm_model', value: model });
    }
    if (maxTokens !== undefined) {
      updates.push({ key: 'llm_max_tokens', value: maxTokens.toString() });
    }
    if (temperature !== undefined) {
      updates.push({ key: 'llm_temperature', value: temperature.toString() });
    }

    // Update each setting
    for (const update of updates) {
      await prisma.appSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: {
          key: update.key,
          value: update.value
        }
      });
    }

    // Fetch updated settings
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: ['llm_model', 'llm_max_tokens', 'llm_temperature']
        }
      }
    });

    const llmSettings: LlmSettings = {
      model: settings.find(s => s.key === 'llm_model')?.value || 'gpt-3.5-turbo',
      maxTokens: parseInt(settings.find(s => s.key === 'llm_max_tokens')?.value || '2000'),
      temperature: parseFloat(settings.find(s => s.key === 'llm_temperature')?.value || '0.7')
    };

    res.json({
      success: true,
      data: llmSettings
    });
  } catch (error: unknown) {
    console.error('[SettingsController] Error updating LLM settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'Failed to update LLM settings',
      details: errorMessage
    } as ErrorResponse);
  }
}
