-- CreateTable
CREATE TABLE "prompts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- Insert default LLM settings
INSERT INTO "app_settings" ("id", "key", "value", "created_at", "updated_at")
VALUES 
    (gen_random_uuid()::text, 'llm_model', 'gpt-3.5-turbo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'llm_max_tokens', '2000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'llm_temperature', '0.7', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert default prompts (migrated from code)
INSERT INTO "prompts" ("id", "name", "description", "prompt", "is_default", "created_at", "updated_at")
VALUES 
    ('summarize', 'Summarize', 'Create a concise summary of the video content', 'Please provide a concise summary of the following video transcript. Focus on the main points and key information.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('key-points', 'Extract Key Points', 'Identify and list the main points from the video', 'Extract and list the main points and key takeaways from this video transcript. Format as a numbered list.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('sentiment', 'Sentiment Analysis', 'Analyze the overall sentiment of the content', 'Analyze the overall sentiment and tone of this video transcript. Is it positive, negative, neutral, or mixed? Provide reasoning.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('topics', 'Topic Classification', 'Classify the video into categories', 'Classify this video into relevant categories/topics based on the transcript. What is the primary subject matter and related subtopics?', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('questions', 'Question Generation', 'Generate quiz questions from the content', 'Generate 5 quiz questions based on the key information in this video transcript. Include the answers.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('takeaways', 'Key Takeaways', 'Extract the most important takeaways', 'What are the most important takeaways from this video? List them in order of importance.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('transcript', 'Full Transcript', 'Return the complete transcript', 'Please return the complete transcript exactly as provided, formatted cleanly.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
