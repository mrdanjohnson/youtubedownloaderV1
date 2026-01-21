# YT Insight Session

A full-stack application for downloading YouTube video subtitles (SRT) and running AI-powered analysis on the content. Built with React, Node.js, Express, PostgreSQL, and Docker.

## Features

- **YouTube URL Input**: Paste any YouTube URL to extract subtitles
- **Clean Text Option**: Remove timecodes and formatting for cleaner LLM processing (enabled by default)
- **Automatic Deduplication**: Removes duplicate lines and VTT artifacts from subtitles
- **SRT Download**: Download subtitles as clean text or original SRT format
- **AI Analysis**: Run custom or predefined AI prompts on subtitle content using OpenAI GPT-3.5-turbo
- **Session Management**: Each analysis creates a unique session URL with persistent storage
- **Subtitle Viewer**: View subtitles in a clean, readable format
- **Local Storage**: All data persisted in PostgreSQL with JSONB support
- **Docker Ready**: Complete containerized setup with automatic migrations

## What's New

### Recent Updates

- ✨ **Clean Text Toggle**: New checkbox on homepage to remove timecodes, VTT tags, and formatting before saving to database
- 🧹 **Enhanced Cleaning**: Automatically removes:
  - VTT/HTML tags (`<c>`, `<v>`, `<i>`, etc.)
  - Inline timecodes (`<00:00:00.000>`)
  - HTML entities (`&gt;&gt;`, `&lt;`, `&amp;`, etc.)
  - Duplicate lines caused by VTT format
  - Alignment and positioning metadata
- 🔧 **VTT Processing Fix**: Fixed subtitle duplication issues in VTT to SRT conversion
- 🤖 **Real OpenAI Integration**: Replaced mock responses with actual GPT-3.5-turbo API calls
- 📦 **Database-First Cleaning**: Subtitles are cleaned before storage, ensuring consistent clean text for both viewing and AI processing

## Prerequisites

- Docker and Docker Compose
- OpenAI API Key (for AI features)
- Node.js 18+ (for local development only)
- npm or yarn (for local development only)

## Quick Start with Docker

### 1. Clone and Setup

```bash
git clone <repository-url>
cd YoutubeDownloader
```

### 2. Configure Environment

Copy the example environment file and edit with your settings:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your settings (especially AI_API_KEY)
```

**Required Configuration:**
- `AI_API_KEY`: Your OpenAI API key from https://platform.openai.com/api-keys

**Optional Configuration (has sensible defaults):**
- `POSTGRES_PASSWORD`: Database password (default: ytsession123)
- `BACKEND_PORT`: Backend API port (default: 3000)
- `FRONTEND_PORT`: Frontend UI port (default: 5173)
- `AI_MODEL`: OpenAI model to use (default: gpt-4o)

**Note**: The application will work without an OpenAI API key, but AI features will be disabled.

### 3. Start with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

This will start three containers:
- **PostgreSQL** (port 5432): Database server with health checks
- **Backend** (port 3000): Node.js API server with automatic migrations
- **Frontend** (port 5173): React development server

### 4. Access the Application

**Local Access:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

**Remote Access (from other devices on your network):**
- **Frontend**: http://YOUR_SERVER_IP:5173 (e.g., http://10.10.40.91:5173)
- **Backend API**: http://YOUR_SERVER_IP:3000

**Note**: The frontend automatically detects the correct backend URL based on your browser's location. No additional configuration needed for remote access!

### 5. First Run Setup

The backend automatically runs database migrations on startup. No manual setup required!

## Docker Configuration

### Volume Mounts

The application uses the following volume mounts:

```yaml
# PostgreSQL Data Persistence
volumes:
  postgres_data:  # Database data persists between container restarts

# No source code volumes by default
# Code is copied into containers during build for production-like environment
```

**Note**: The current setup does not mount source code as volumes. This means:
- ✅ Faster container startup
- ✅ Production-like environment
- ❌ Requires rebuild for code changes: `docker-compose build <service>`

### Development with Hot Reload (Optional)

To enable hot reload during development, add these volume mounts to `docker-compose.yml`:

```yaml
services:
  backend:
    volumes:
      - ./backend/src:/app/src  # Backend hot reload
      
  frontend:
    volumes:
      - ./frontend/src:/app/src  # Frontend hot reload
```

### Container Architecture

```
┌─────────────────────────────────────────┐
│  Frontend Container (Vite Dev Server)   │
│  Port: 5173                             │
│  Base: node:20-alpine                   │
└─────────────────┬───────────────────────┘
                  │
                  │ API Calls
                  ▼
┌─────────────────────────────────────────┐
│  Backend Container (Express + Prisma)   │
│  Port: 3000                             │
│  Base: node:20-alpine                   │
│  Includes: Python, yt-dlp, ffmpeg       │
└─────────────────┬───────────────────────┘
                  │
                  │ SQL Queries
                  ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Container                   │
│  Port: 5432                             │
│  Base: postgres:15-alpine               │
│  Volume: postgres_data                  │
└─────────────────────────────────────────┘
```

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f                    # All services
docker-compose logs -f backend            # Backend only
docker-compose logs -f frontend           # Frontend only

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Restart service
docker-compose restart backend
docker-compose restart frontend

# Execute commands in containers
docker-compose exec backend sh            # Backend shell
docker-compose exec postgres psql -U ytsession  # PostgreSQL CLI

# Stop all services
docker-compose down

# Stop and remove all data (⚠️ destroys database)
docker-compose down -v
```

## Local Development

### Backend

```bash
cd backend

# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Start development server
npm run dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## API Endpoints

### Session Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session` | Create new session and download SRT |
| GET | `/api/session/:id` | Get session details |
| GET | `/api/session/:id/srt` | Download SRT file |
| PUT | `/api/session/:id` | Update session |
| DELETE | `/api/session/:id` | Delete session |

### AI Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session/:id/run-prompt` | Run AI prompt on session |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |

## Configuration

### Environment Variables

#### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| AI_API_KEY | sk-proj-... | **Required** - OpenAI API key for AI analysis features |
| DATABASE_URL | postgresql://... | **Required** - PostgreSQL connection string |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| POSTGRES_USER | ytsession | PostgreSQL username |
| POSTGRES_PASSWORD | ytsession123 | PostgreSQL password |
| POSTGRES_DB | ytsession | Database name |
| POSTGRES_PORT | 5432 | PostgreSQL port |
| BACKEND_PORT | 3000 | Backend server port |
| FRONTEND_PORT | 5173 | Frontend dev server port |
| AI_MODEL | gpt-3.5-turbo | AI model to use (OpenAI) |
| VITE_API_URL | http://localhost:3000 | Backend API URL for frontend |

### Predefined AI Prompts

The application includes several predefined prompts:

- **Summarize**: Create a concise summary of the video content
- **Extract Key Points**: Identify and list the main points
- **Sentiment Analysis**: Analyze the overall sentiment
- **Topic Classification**: Classify the video into categories
- **Question Generation**: Generate quiz questions from the content
- **Key Takeaways**: Extract the most important takeaways
- **Full Transcript**: Return the complete transcript

## Project Structure

```
yt-insight-session/
├── docker-compose.yml       # Docker orchestration
├── .env.example             # Environment template
├── README.md                # Documentation
├── backend/
│   ├── Dockerfile           # Backend container image
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── src/
│       ├── index.ts         # Entry point
│       ├── app.ts           # Express app setup
│       ├── routes/          # API routes
│       ├── controllers/     # Route handlers
│       ├── services/        # Business logic
│       └── types/           # TypeScript types
└── frontend/
    ├── Dockerfile           # Frontend container image
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx         # Entry point
        ├── App.tsx          # Main app component
        ├── api/             # API client
        ├── types/           # TypeScript types
        ├── pages/           # Page components
        └── components/      # Reusable components
```

## Database Schema

### Session Model

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique session identifier |
| youtube_url | String | Original YouTube URL |
| video_title | String? | Video title (optional) |
| srt_text | Text? | Subtitle content (optional) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |
| ai_results | JSON | Array of AI analysis results |
| app_settings | JSON | Additional settings |

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and the connection string in `.env` is correct:

```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### Backend Won't Start

Check if the database is healthy before the backend starts:

```bash
docker-compose logs backend
```

### Frontend Not Loading

Ensure the backend is running and the `VITE_API_URL` environment variable is correct.

### yt-dlp Issues

The backend uses yt-dlp to download subtitles. If you encounter issues:

1. Check if Python is installed in the backend container
2. Verify yt-dlp is installed: `docker-compose exec backend which yt-dlp`
3. Check backend logs for specific error messages

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data will be lost)
docker-compose down -v
```

## License

MIT License - feel free to use this project for any purpose.
