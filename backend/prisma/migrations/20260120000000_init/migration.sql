-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "youtube_url" TEXT NOT NULL,
    "video_title" TEXT,
    "srt_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ai_results" JSONB NOT NULL DEFAULT '[]',
    "app_settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_created_at_idx" ON "sessions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "sessions_youtube_url_idx" ON "sessions"("youtube_url");
