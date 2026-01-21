# RefCodeArtifact-2026-01-21

**Project:** YT Insight Session - YouTube Subtitle Analyzer with AI  
**Type:** Full-Stack Web Application  
**Last Updated:** January 21, 2026

---

## 1. Project Overview

### Purpose
YT Insight Session is a full-stack application that downloads YouTube video subtitles and enables AI-powered analysis of the content. Users can paste YouTube URLs, automatically extract subtitles (auto-generated or manual), clean the text, optionally download the video file, and run predefined or custom AI prompts to analyze the content.

### Core Functionality
- **YouTube Subtitle Extraction**: Downloads subtitles using `yt-dlp` CLI tool
- **Text Cleaning**: Removes timecodes, VTT tags, HTML entities, and duplicate lines
- **Video Download**: Optional full video download feature
- **AI Analysis**: OpenAI GPT integration for content analysis with predefined and custom prompts
- **Session Management**: Persistent storage of sessions with UUID-based URLs
- **Settings Management**: Customizable AI prompts and LLM configuration

### Tech Stack

**Frontend:**
- React 18.2 with TypeScript
- Vite 5.0 (build tool & dev server)
- React Router DOM 6.21 (routing)
- TailwindCSS 3.4 (styling)
- Axios 1.6 (HTTP client)

**Backend:**
- Node.js 20+ with TypeScript
- Express 4.18 (web framework)
- Prisma 5.7 (ORM)
- PostgreSQL 15 (database)
- yt-dlp (YouTube download tool)
- OpenAI API (GPT-3.5-turbo, GPT-4, GPT-4o)

**Infrastructure:**
- Docker & Docker Compose
- Alpine Linux base images
- Health checks and graceful shutdown handling

### Architecture Pattern
**Layered MVC Architecture:**
- **Frontend**: Component-based React SPA with page-level routing
- **Backend**: RESTful API with controller → service → database layers
- **Database**: PostgreSQL with Prisma ORM for type-safe queries
- **External Services**: yt-dlp (subprocess), OpenAI API (HTTP)

---

## 2. Project Structure

### Backend (`/backend`)

```
backend/
├── docker-entrypoint.sh      # Container startup script with migration runner
├── Dockerfile                # Multi-stage Node.js + yt-dlp build
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── prisma/
│   ├── schema.prisma         # Database schema (Session, Prompt, AppSetting models)
│   └── migrations/           # SQL migration history
│       ├── 20260120000000_init/
│       └── 20260120190000_add_prompts_and_settings/
└── src/
    ├── index.ts              # Application entry point & server startup
    ├── app.ts                # Express app configuration & middleware
    ├── types/
    │   └── index.ts          # TypeScript interfaces & types
    ├── controllers/
    │   ├── session.controller.ts    # Session CRUD & prompt execution
    │   └── settings.controller.ts   # Prompts & LLM settings management
    ├── routes/
    │   ├── index.ts          # Main router with health check
    │   ├── session.routes.ts # Session endpoints
    │   └── settings.routes.ts# Settings endpoints
    └── services/
        ├── youtube.service.ts# yt-dlp wrapper for downloads & conversion
        └── ai.service.ts     # OpenAI API integration & mock responses
```

### Frontend (`/frontend`)

```
frontend/
├── Dockerfile                # Vite dev server container
├── index.html                # HTML entry point
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── tailwind.config.js        # TailwindCSS configuration
└── src/
    ├── main.tsx              # React app bootstrap
    ├── App.tsx               # Root component with routing
    ├── index.css             # Global styles & Tailwind imports
    ├── types/
    │   └── index.ts          # TypeScript interfaces (mirrors backend)
    ├── api/
    │   └── client.ts         # Axios API client with typed methods
    ├── components/
    │   ├── UrlInput.tsx      # YouTube URL input form with clean text toggle
    │   ├── SrtViewer.tsx     # Subtitle display component
    │   └── PromptRunner.tsx  # AI prompt execution interface
    └── pages/
        ├── Home.tsx          # Main page: URL input + recent sessions
        ├── Session.tsx       # Session detail: subtitles + AI results
        └── Settings.tsx      # Prompts & LLM configuration management
```

### Root Configuration

```
/
├── docker-compose.yml        # Multi-container orchestration (postgres, backend, frontend)
├── .env.example              # Environment variable template
├── README.md                 # User-facing documentation
├── SETTINGS_IMPLEMENTATION.md# Technical implementation notes for settings system
└── casaosDockerInstall.MD    # CasaOS deployment guide
```

---

## 3. Core Components/Modules

### Backend Controllers

#### `session.controller.ts`
**Responsibilities:**
- `createSession()`: Downloads subtitles (and optionally video), creates DB session
- `getSession()`: Fetches session by UUID
- `getAllSessions()`: Lists all sessions (ordered by creation date)
- `deleteSession()`: Removes session and associated video file
- `downloadSrt()`: Serves subtitle file as downloadable text
- `downloadVideoFile()`: Serves video file as downloadable MP4
- `runPrompt()`: Executes AI prompt on session's subtitle content
- `getPredefinedPrompts()`: Fetches prompts from database

**Key Logic:**
- UUID validation for session IDs
- Optional text cleaning before storage (removes timecodes, VTT tags, duplicates)
- Progress tracking via EventEmitter for download stages
- Stores AI results in JSONB array within session record

#### `settings.controller.ts`
**Responsibilities:**
- `getAllPrompts()`: Returns all prompts (defaults + custom)
- `createPrompt()`: Creates new custom prompt
- `updatePrompt()`: Updates custom prompt (blocks editing defaults)
- `deletePrompt()`: Deletes custom prompt (blocks deleting defaults)
- `getLlmSettings()`: Returns current LLM configuration
- `updateLlmSettings()`: Updates model, maxTokens, temperature

**Protection Logic:**
- Default prompts (7 seeded prompts) have `is_default=true` and cannot be edited/deleted
- Returns 403 Forbidden when attempting to modify defaults

### Backend Services

#### `youtube.service.ts`
**External Dependencies:** `yt-dlp` command-line tool

**Key Functions:**
- `downloadSubtitles(url, sessionId?)`: 
  - Validates YouTube URL format
  - Fetches video title
  - Downloads subtitles (tries auto-generated en → manual en)
  - Returns VTT file converted to SRT format
  - Emits progress events (title, subtitles, complete)
  
- `downloadVideo(url, sessionId)`:
  - Downloads highest quality MP4 (merges video+audio)
  - 10-minute timeout for large files
  - Returns file path in `/tmp`
  
- `convertVttToSrt(vttContent)`:
  - Removes WEBVTT header
  - Converts timestamp format (MM:SS.mmm → HH:MM:SS,mmm)
  - Strips inline timecodes (`<00:00:00.000>`) to prevent duplication
  - Adds SRT sequence numbers
  
- `cleanSrtContent(srtText)`:
  - Removes all timecodes and sequence numbers
  - Strips VTT/HTML tags (`<c>`, `<v>`, `<i>`, etc.)
  - Decodes HTML entities (`&gt;&gt;` → `>>`)
  - Deduplicates consecutive identical lines
  - Returns plain text transcript

**File Storage:**
- Subtitles: `/tmp/{sessionId}.srt`
- Videos: `/tmp/{sessionId}.mp4` (or .webm, .mkv)

#### `ai.service.ts`
**External Dependencies:** OpenAI API

**Key Functions:**
- `processWithAi(srtContent, prompt, settings)`:
  - Checks if API key is valid (`mock-key` triggers mock mode)
  - Dispatches to real or mock AI processing
  
- `processWithRealAi()`:
  - Strips SRT formatting to plain text
  - Truncates to ~12,000 chars (~3,000 tokens)
  - Calls OpenAI Chat Completions API
  - Uses system prompt: "You are an AI assistant that analyzes video transcripts..."
  - Returns structured AiResult with id, prompt, response, model, timestamp
  
- `processWithMockAi()`:
  - Simulates 1.5-2.5 second delay
  - Generates contextual mock responses based on prompt keywords
  - Supports: summarize, key points, sentiment, topics, questions, takeaways

**Configuration:**
- Model: `gpt-3.5-turbo` | `gpt-4` | `gpt-4-turbo` | `gpt-4o`
- Max Tokens: 500-4000 (configurable via settings)
- Temperature: 0-2 (configurable via settings)

### Frontend Pages

#### `Home.tsx`
**Features:**
- YouTube URL input form with `UrlInput` component
- "Clean Text" checkbox (enabled by default)
- "Download Video" checkbox
- Progress indicator during session creation
- Recent sessions list with delete functionality
- Settings button (gear icon) in header

**Flow:**
1. User pastes YouTube URL
2. Optional: toggle clean text / download video
3. Click "Download Subtitles"
4. Progress bar shows download stages
5. Redirects to `/session/{id}` on completion

#### `Session.tsx`
**Features:**
- Video title and metadata display
- Subtitle viewer (`SrtViewer` component)
- Download buttons (subtitle as .txt, video as .mp4)
- Video URL copy button (for direct streaming)
- AI prompt runner (`PromptRunner` component)
- AI results display with expandable sections
- Delete session button
- Back to home link

**Layout:**
- Header: Title, metadata, action buttons
- Main: Two-column layout (subtitles | AI prompts/results)
- Responsive: Stacks vertically on mobile

#### `Settings.tsx`
**Features:**
- Two-tab interface:
  - **AI Prompts Tab:**
    - Create/edit form (name, description, prompt text)
    - Prompt list with edit/delete buttons
    - Visual badges for default vs custom prompts
    - Protection: Cannot edit/delete defaults
  - **LLM Configuration Tab:**
    - Model dropdown (GPT-3.5, GPT-4, GPT-4 Turbo, GPT-4o)
    - Max tokens slider (500-4000)
    - Temperature slider (0-2, step 0.1)
    - Save button

**UX Details:**
- Success/error messages with auto-dismiss (5 seconds)
- Delete confirmation dialogs
- Back to home button in header
- Loading spinner during data fetch

### Frontend Components

#### `UrlInput.tsx`
**Props:**
- `onSubmit(url, cleanText, downloadVideo)`
- `loading: boolean`
- `progress?: { stage: string, progress: number }`
- `processingError?: string`

**Features:**
- URL input field with validation
- Clean text checkbox (default: true)
- Download video checkbox (default: false)
- Progress bar with percentage
- Submit button (disabled during processing)
- Error display inline

#### `PromptRunner.tsx`
**Props:**
- `sessionId: string`
- `srtContent: string`
- `existingResults: AiResult[]`
- `predefinedPrompts: PredefinedPrompt[]`
- `onPromptRun(prompt)`

**Features:**
- Predefined prompt buttons (from database)
- Custom prompt textarea
- Run button with loading spinner
- Result display with timestamp
- Copy result to clipboard
- Expandable/collapsible results

#### `SrtViewer.tsx`
**Props:**
- `srtContent: string`

**Features:**
- Displays subtitle content in scrollable container
- Preserves formatting (if not cleaned)
- White text on dark background
- Auto-scroll to top

---

## 4. Data Models & Schemas

### Prisma Schema (`schema.prisma`)

#### `Session` Model
```prisma
model Session {
  id              String   @id @default(uuid())
  youtube_url     String
  video_title     String?  @db.Text
  srt_text        String?  @db.Text
  video_file_path String?  @db.Text
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // JSONB fields
  ai_results      Json     @default("[]")    // AiResult[]
  app_settings    Json     @default("{}")    // AppSettings
}
```

**ai_results Structure:**
```typescript
[
  {
    id: string,
    prompt: string,
    response: string,
    model: string,
    timestamp: string (ISO 8601)
  }
]
```

#### `Prompt` Model
```prisma
model Prompt {
  id          String   @id @default(uuid())
  name        String
  description String
  prompt      String   @db.Text
  is_default  Boolean  @default(false)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
}
```

**Default Prompts (7 seeded):**
1. Summarize
2. Extract Key Points
3. Sentiment Analysis
4. Topic Classification
5. Question Generation
6. Key Takeaways
7. Full Transcript

#### `AppSetting` Model
```prisma
model AppSetting {
  id         String   @id @default(uuid())
  key        String   @unique
  value      String   @db.Text
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

**Seeded Settings:**
- `llm_model`: `"gpt-3.5-turbo"`
- `llm_max_tokens`: `"2000"`
- `llm_temperature`: `"0.7"`

### Database Migrations

1. **20260120000000_init**:
   - Creates `sessions` table
   - Initializes JSONB columns for `ai_results` and `app_settings`

2. **20260120190000_add_prompts_and_settings**:
   - Creates `prompts` table
   - Creates `app_settings` table
   - Seeds 7 default prompts
   - Seeds 3 LLM settings

---

## 5. Key Design Decisions

### Why yt-dlp over YouTube API?
- **No API key required**: YouTube Data API has strict quotas
- **Subtitle access**: Direct subtitle download without authentication
- **Video download**: High-quality video download capability
- **Reliability**: Actively maintained, handles YouTube changes

### Why Prisma over Raw SQL?
- **Type safety**: Auto-generated TypeScript types from schema
- **Migrations**: Version-controlled schema changes
- **Developer experience**: Intuitive query API, excellent autocomplete

### Why JSONB for ai_results?
- **Flexibility**: AI results are append-only, no need for separate table
- **Simplicity**: No complex joins needed for session retrieval
- **Performance**: PostgreSQL JSONB is indexed and queryable
- **Scalability**: Each session is self-contained

### Why Clean Text Option?
- **LLM efficiency**: Timecodes and formatting waste tokens
- **Better analysis**: Plain text produces more coherent AI responses
- **User choice**: Power users may want original SRT format
- **Database-first**: Cleaning happens before storage for consistency

### Why Mock AI Mode?
- **Development**: Test UI/UX without burning API credits
- **Demos**: Show functionality without OpenAI account
- **Fallback**: Graceful degradation if API key is missing/invalid

### Why Separate Settings Routes?
- **Separation of concerns**: Settings management vs session management
- **Future expansion**: Easier to add user authentication, multi-tenant features
- **API clarity**: `/api/settings` vs `/api/session` namespacing

### Why Docker Compose?
- **Portability**: Run anywhere Docker runs (local, cloud, NAS)
- **Consistency**: Same environment for dev and production
- **Dependencies**: Automatic Postgres setup with health checks
- **Simplicity**: Single `docker-compose up` command

---

## 6. Current State

### ✅ Implemented & Working

**Core Features:**
- YouTube subtitle download (auto-generated + manual)
- VTT to SRT conversion with deduplication
- Optional text cleaning (removes timecodes, tags, duplicates)
- Optional video download (highest quality MP4)
- Session persistence with PostgreSQL
- OpenAI GPT integration (3.5-turbo, 4, 4-turbo, 4o)
- Mock AI mode for testing
- Session CRUD (create, read, list, delete)
- File downloads (subtitle .txt, video .mp4)
- Direct video URL for streaming

**Settings System:**
- Database-backed prompt management
- 7 predefined prompts (protected from editing/deletion)
- Custom prompt creation/editing/deletion
- LLM configuration (model, maxTokens, temperature)
- Settings persistence in PostgreSQL

**UI/UX:**
- React SPA with client-side routing
- Responsive TailwindCSS design
- Progress indicators for downloads
- Success/error messaging with auto-dismiss
- Loading spinners and disabled states
- Confirmation dialogs for destructive actions

**DevOps:**
- Docker multi-stage builds
- Health checks for all services
- Automatic database migrations on startup
- Graceful shutdown handling
- Volume persistence for Postgres data
- DNS configuration for backend container

### ⚠️ Known Issues & Limitations

**Technical:**
- Video files stored in `/tmp` (ephemeral, lost on container restart)
- No file size limits (could fill disk with large videos)
- No cleanup task for old video files
- Single-user application (no authentication)
- AI processing has 12,000 char limit (~3,000 tokens)
- yt-dlp errors not always user-friendly

**UX:**
- Video download progress not shown (long wait for large files)
- No AI streaming responses (entire response arrives at once)
- No prompt templating/variables
- Cannot re-download subtitles for existing session
- Session list not paginated (could be slow with hundreds of sessions)

**Missing Features:**
- No video playback in browser (must download or use URL)
- No subtitle editing
- No AI result export (PDF, Markdown)
- No session search/filtering
- No analytics or usage stats

### 📝 Areas of Active Development

**Recent Changes (Last 7 Days):**
- Added comprehensive settings management system
- Migrated from hardcoded prompts to database-backed prompts
- Implemented LLM configuration UI
- Added video download feature
- Fixed VTT to SRT duplication issues
- Replaced mock AI with real OpenAI integration
- Added clean text toggle on homepage

**TODOs (Not Implemented):**
- Persistent video storage (e.g., S3, local volume mount)
- Background job queue for long downloads
- WebSocket for real-time progress updates
- AI streaming responses (OpenAI streaming API)
- Prompt templates with variables (e.g., `{{topic}}`)
- User authentication & multi-tenancy
- Session sharing via public URLs
- Subtitle editing interface
- Video player integration (video.js, Plyr)
- Transcript search & highlight
- Export AI results as PDF/Markdown
- Session tags & categories
- Pagination for session list

---

## 7. Development Workflows

### Running with Docker (Recommended)

**Prerequisites:**
- Docker Desktop installed
- OpenAI API key (optional, for real AI features)

**Setup:**
```bash
# 1. Clone repository
git clone <repo-url>
cd youtubedownloaderV1

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env file (add OpenAI API key)
# AI_API_KEY=sk-your-actual-key-here

# 4. Start all services
docker-compose up --build

# 5. Access application
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# Health:   http://localhost:3000/health
```

**Common Commands:**
```bash
# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after code changes
docker-compose up --build

# Reset database (delete volume)
docker-compose down -v
docker-compose up --build

# Access Postgres directly
docker exec -it yt_session_db psql -U ytsession -d ytsession
```

### Running Locally (Development)

**Prerequisites:**
- Node.js 20+
- PostgreSQL 15+
- yt-dlp installed (`pip install yt-dlp`)

**Backend Setup:**
```bash
cd backend

# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://ytsession:ytsession123@localhost:5432/ytsession"
export AI_API_KEY="sk-your-key-here"
export AI_MODEL="gpt-3.5-turbo"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start dev server (auto-reload)
npm run dev

# Or build and run production
npm run build
npm start
```

**Frontend Setup:**
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
export VITE_API_URL="http://localhost:3000"

# Start dev server (hot reload)
npm run dev

# Or build for production
npm run build
npm run preview
```

### Database Management

**Run Migrations:**
```bash
cd backend
npx prisma migrate deploy
```

**Create New Migration:**
```bash
npx prisma migrate dev --name describe_change
```

**Prisma Studio (DB GUI):**
```bash
npx prisma studio
# Opens http://localhost:5555
```

**Reset Database:**
```bash
npx prisma migrate reset
# WARNING: Deletes all data!
```

### Environment Variables

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `AI_API_KEY`: OpenAI API key (or `mock-key` for testing)

**Optional:**
- `PORT`: Backend port (default: 3000)
- `AI_MODEL`: OpenAI model (default: gpt-3.5-turbo)
- `NODE_ENV`: `production` | `development`
- `CORS_ORIGIN`: CORS allowed origin (default: *)
- `VITE_API_URL`: Frontend API URL (default: http://localhost:3000)
- `BACKEND_PORT`: Docker host port for backend (default: 3000)
- `FRONTEND_PORT`: Docker host port for frontend (default: 5173)
- `POSTGRES_PASSWORD`: Database password (default: ytsession123)

### Testing

**Backend Health Check:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

**API Endpoints:**
```bash
# Create session
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "cleanText": true}'

# Get session
curl http://localhost:3000/api/session/{session-id}

# Run prompt
curl -X POST http://localhost:3000/api/session/{session-id}/run-prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Summarize this video in 3 sentences"}'

# Get prompts
curl http://localhost:3000/api/settings/prompts
```

### Deployment to Production

**Docker Compose (Recommended):**
1. Set strong `POSTGRES_PASSWORD` in `.env`
2. Add real `AI_API_KEY` in `.env`
3. Configure reverse proxy (nginx, Caddy) for HTTPS
4. Set `NODE_ENV=production`
5. Run `docker-compose up -d`

**Manual Deployment:**
1. Set up PostgreSQL server
2. Build backend: `npm run build`
3. Build frontend: `npm run build`
4. Serve frontend with nginx/Apache
5. Run backend with PM2 or systemd
6. Configure CORS to allow frontend domain

**CasaOS Deployment:**
See `casaosDockerInstall.MD` for step-by-step guide.

---

## API Reference

### Session Endpoints

| Method | Endpoint | Description | Body/Params |
|--------|----------|-------------|-------------|
| `POST` | `/api/session` | Create new session | `{ youtubeUrl, cleanText?, downloadVideo? }` |
| `GET` | `/api/session` | List all sessions | - |
| `GET` | `/api/session/:id` | Get session by ID | `id` (UUID) |
| `DELETE` | `/api/session/:id` | Delete session | `id` (UUID) |
| `GET` | `/api/session/:id/srt` | Download subtitle file | `id` (UUID) |
| `GET` | `/api/session/:id/video` | Download/stream video | `id` (UUID) |
| `POST` | `/api/session/:id/run-prompt` | Run AI prompt | `{ prompt }` |
| `GET` | `/api/session/prompts/list` | Get all prompts | - |

### Settings Endpoints

| Method | Endpoint | Description | Body/Params |
|--------|----------|-------------|-------------|
| `GET` | `/api/settings/prompts` | Get all prompts | - |
| `POST` | `/api/settings/prompts` | Create prompt | `{ name, description, prompt }` |
| `PUT` | `/api/settings/prompts/:id` | Update prompt | `{ name?, description?, prompt? }` |
| `DELETE` | `/api/settings/prompts/:id` | Delete prompt | `id` (UUID) |
| `GET` | `/api/settings/llm` | Get LLM settings | - |
| `PUT` | `/api/settings/llm` | Update LLM settings | `{ model?, maxTokens?, temperature? }` |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health status |

---

## Quick Onboarding Checklist

When starting a new conversation with this codebase:

- [ ] **Project Type**: Full-stack YouTube subtitle analyzer with AI
- [ ] **Tech Stack**: React + TypeScript, Node.js + Express, PostgreSQL, Docker
- [ ] **External Tools**: yt-dlp (YouTube downloads), OpenAI API (AI analysis)
- [ ] **Database**: Prisma ORM with 3 models (Session, Prompt, AppSetting)
- [ ] **Key Features**: Subtitle download, text cleaning, video download, AI prompts, settings management
- [ ] **Architecture**: RESTful API, MVC pattern, JSONB for flexible storage
- [ ] **Docker**: 3 containers (postgres, backend, frontend) with health checks
- [ ] **Entry Points**: Backend `src/index.ts`, Frontend `src/main.tsx`
- [ ] **AI Mode**: Real (OpenAI) or Mock (no API key)
- [ ] **Migrations**: Auto-run on container startup
- [ ] **File Storage**: Temporary `/tmp` directory (ephemeral)
- [ ] **Known Limits**: Single-user, no auth, 12K char AI limit, tmp storage

---

## Common Tasks Quick Reference

| Task | Command/Action |
|------|----------------|
| Start app | `docker-compose up --build` |
| View logs | `docker-compose logs -f backend` |
| Stop app | `docker-compose down` |
| Reset DB | `docker-compose down -v && docker-compose up --build` |
| Add migration | `cd backend && npx prisma migrate dev --name your_name` |
| DB GUI | `npx prisma studio` |
| Backend dev | `cd backend && npm run dev` |
| Frontend dev | `cd frontend && npm run dev` |
| Health check | `curl http://localhost:3000/health` |
| Access Postgres | `docker exec -it yt_session_db psql -U ytsession` |

---

## Important File Locations

| File | Purpose |
|------|---------|
| `backend/src/controllers/session.controller.ts` | Session CRUD & AI prompt execution |
| `backend/src/services/youtube.service.ts` | yt-dlp wrapper, VTT→SRT conversion |
| `backend/src/services/ai.service.ts` | OpenAI integration & mock responses |
| `backend/prisma/schema.prisma` | Database schema definition |
| `frontend/src/pages/Home.tsx` | Main landing page |
| `frontend/src/pages/Session.tsx` | Session detail view |
| `frontend/src/pages/Settings.tsx` | Prompts & LLM config |
| `frontend/src/api/client.ts` | Axios API client |
| `docker-compose.yml` | Container orchestration |
| `.env.example` | Environment variable template |

---

**End of Reference Document**

*Use this document as context when onboarding in new conversations. Paste it at the start of your prompt to quickly bring AI assistants up to speed on the project structure, design decisions, and current state.*
