// AI processing service - supports mock and real LLM calls
import { v4 as uuidv4 } from 'uuid';
import { AiResult, AppSettings } from '../types';

// Configuration for AI processing
interface AiConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Processes a prompt against subtitle content using AI
 * @param srtContent - The subtitle content to analyze
 * @param prompt - The prompt to send to AI
 * @param settings - AI settings
 * @returns Promise<AiResult>
 */
export async function processWithAi(
  srtContent: string,
  prompt: string,
  settings: AppSettings = {}
): Promise<AiResult> {
  const config: AiConfig = {
    apiKey: process.env.AI_API_KEY || 'mock-key',
    model: settings.model || process.env.AI_MODEL || 'gpt-3.5-turbo',
    maxTokens: settings.maxTokens || 4000,
    temperature: settings.temperature || 0.7
  };

  // Check if using mock mode (no API key or mock-key)
  if (config.apiKey === 'mock-key' || !config.apiKey) {
    return processWithMockAi(srtContent, prompt, config);
  }

  // Real AI processing (placeholder for actual implementation)
  return processWithRealAi(srtContent, prompt, config);
}

/**
 * Mock AI processing for testing without API keys
 */
async function processWithMockAi(
  srtContent: string,
  prompt: string,
  config: AiConfig
): Promise<AiResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Generate mock response based on prompt type
  const response = generateMockResponse(srtContent, prompt);

  return {
    id: uuidv4(),
    prompt,
    response,
    model: config.model,
    timestamp: new Date().toISOString()
  };
}

/**
 * Strips SRT formatting to get plain text transcript
 */
function stripSrtFormatting(srtContent: string): string {
  const lines = srtContent.split('\n');
  const textLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip sequence numbers, timestamps, and empty lines
    if (trimmed && 
        !trimmed.match(/^\d+$/) && 
        !trimmed.includes('-->')) {
      textLines.push(trimmed);
    }
  }
  
  return textLines.join(' ');
}

/**
 * Real AI processing using OpenAI API
 */
async function processWithRealAi(
  srtContent: string,
  prompt: string,
  config: AiConfig
): Promise<AiResult> {
  console.log(`[AiService] Processing with OpenAI - Model: ${config.model}`);
  
  try {
    // Strip SRT formatting and limit length
    const plainText = stripSrtFormatting(srtContent);
    const maxChars = 12000; // ~3000 tokens
    const truncatedText = plainText.substring(0, maxChars);
    
    console.log(`[AiService] Transcript length: ${plainText.length} chars, truncated to: ${truncatedText.length}`);
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that analyzes video transcripts and provides helpful insights. Follow the user\'s instructions carefully regarding the desired length and format of your response.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nTranscript:\n${truncatedText}`
          }
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AiService] OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';
    
    console.log(`[AiService] Successfully generated response (${aiResponse.length} chars)`);

    return {
      id: uuidv4(),
      prompt,
      response: aiResponse,
      model: config.model,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[AiService] Error calling OpenAI:`, error);
    throw error;
  }
}

/**
 * Generates a mock response based on the prompt type
 */
function generateMockResponse(srtContent: string, prompt: string): string {
  const promptLower = prompt.toLowerCase();
  const transcriptPreview = srtContent.substring(0, 500);

  // Detect prompt type and generate appropriate mock response
  if (promptLower.includes('summarize') || promptLower.includes('summary')) {
    return `## Video Summary

Based on the transcript analysis, here is a summary of the video content:

**Overview:**
This video covers important topics related to the subject matter discussed. The content appears to be educational/informational in nature.

**Key Points Discussed:**
1. The primary topic introduces foundational concepts relevant to the subject
2. Several important examples and use cases are demonstrated
3. Practical applications and real-world scenarios are explored
4. The content builds progressively through various examples

**Conclusion:**
The video concludes with key takeaways and actionable insights for viewers to apply.

*Note: This is a mock AI response generated for demonstration purposes. In production, this would be replaced with actual AI analysis.*`;
  }

  if (promptLower.includes('key point') || promptLower.includes('main point')) {
    return `## Key Points from the Video

1. **Primary Topic Introduction**
   - The video begins by establishing the core concepts and framework

2. **Core Concepts Explained**
   - Important terminology and definitions are provided
   - Examples illustrate each concept clearly

3. **Practical Applications**
   - Real-world use cases are demonstrated
   - Best practices and recommendations are shared

4. **Examples and Case Studies**
   - Multiple examples support the main points
   - Case studies provide deeper insights

5. **Summary and Takeaways**
   - Key recommendations for viewers
   - Next steps and resources for further learning

*Note: This is a mock AI response for demonstration purposes.*`;
  }

  if (promptLower.includes('sentiment')) {
    return `## Sentiment Analysis

**Overall Sentiment:** Neutral to Positive

**Analysis:**
- The tone of the video is generally professional and informative
- The presenter maintains an engaging but neutral demeanor
- There are moments of enthusiasm when covering key topics
- The content focuses on education rather than emotional appeal

**Key Observations:**
- Objective language is used throughout
- Facts and information are presented clearly
- No strong polarizing language detected
- The presentation is balanced and informative

*Note: This is a mock AI response for demonstration purposes.*`;
  }

  if (promptLower.includes('topic') || promptLower.includes('categor')) {
    return `## Topic Classification

**Primary Category:** Education / How-To / Tutorial

**Subtopics Identified:**
1. Introduction and Overview
2. Core Concepts and Terminology
3. Practical Demonstrations
4. Best Practices
5. Summary and Conclusion

**Content Type:** Educational Video
**Difficulty Level:** Beginner to Intermediate
**Target Audience:** General viewers interested in the subject matter

*Note: This is a mock AI response for demonstration purposes.*`;
  }

  if (promptLower.includes('question') || promptLower.includes('quiz')) {
    return `## Quiz Questions

1. **Question:** What is the primary focus of this video?
   **Answer:** The video focuses on explaining core concepts related to the subject matter.

2. **Question:** What key terminology is introduced early in the video?
   **Answer:** Several important terms are defined in the introduction section.

3. **Question:** What practical examples are demonstrated?
   **Answer:** Real-world use cases and applications are shown throughout the video.

4. **Question:** What are the main takeaways from this content?
   **Answer:** Key insights include foundational concepts and actionable recommendations.

5. **Question:** What is the recommended next step for viewers?
   **Answer:** The video concludes with suggested resources for further learning.

*Note: This is a mock AI response for demonstration purposes.*`;
  }

  if (promptLower.includes('takeaway') || promptLower.includes('important')) {
    return `## Key Takeaways

**Most Important Insights:**

1. **Foundational Understanding**
   - Understanding the core concepts is essential before advancing

2. **Practical Application**
   - Real-world examples demonstrate effective implementation strategies

3. **Best Practices**
   - Following established guidelines leads to better outcomes

4. **Continuous Learning**
   - The field continues to evolve, requiring ongoing education

**Action Items:**
- Review the core concepts covered
- Practice with the examples provided
- Explore additional resources mentioned
- Apply learned principles in real scenarios

*Note: This is a mock AI response for demonstration purposes.*`;
  }

  // Default: Return the transcript with a note
  return `## Transcript Content

Here is the transcript from the video:

---

${transcriptPreview}

---

*[Additional content would appear here in the full transcript...]*

*Note: This is a mock AI response for demonstration purposes. The AI was asked to provide "${prompt.substring(0, 50)}..."*`;
}

/**
 * Validates AI configuration
 * @param settings - AI settings to validate
 * @returns boolean
 */
export function validateAiConfig(settings: AppSettings): boolean {
  // Basic validation - ensure settings are reasonable
  if (settings.maxTokens && (settings.maxTokens < 1 || settings.maxTokens > 100000)) {
    return false;
  }

  if (settings.temperature && (settings.temperature < 0 || settings.temperature > 2)) {
    return false;
  }

  return true;
}
