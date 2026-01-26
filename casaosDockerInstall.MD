# Installing YT Insight on CasaOS

CasaOS is a home server OS that manages Docker containers via a web UI. Here's how to install your app:

---

## Method 1: Custom Docker Compose (Recommended)

CasaOS supports importing custom `docker-compose.yml` files.

**Steps:**

1. **Access CasaOS Dashboard** (usually `http://casaos.local` or your server IP)

2. **Go to App Store → Custom Install**

3. **Paste your docker-compose.yml** (the one from your repo)

4. **Configure Environment Variables** in the CasaOS UI:
   ```
   POSTGRES_USER=ytsession
   POSTGRES_PASSWORD=ytsession123
   POSTGRES_DB=ytsession
   AI_API_KEY=sk-proj-XIEs... (your key)
   ```

5. **Install & Start**

CasaOS will automatically:
- Pull the images
- Create containers
- Set up networking
- Start services

---

## Method 2: Manual Setup via SSH

If CasaOS custom compose doesn't work:

1. **SSH into your CasaOS server:**
   ```bash
   ssh root@casaos.local
   ```

2. **Clone the repository:**
   ```bash
   cd /DATA/AppData  # CasaOS app directory
   git clone https://github.com/yourusername/youtube-downloader.git yt-insight
   cd yt-insight
   ```

3. **Create .env file:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   **⚠️ IMPORTANT:** Update these values:
   ```env
   DATABASE_URL=postgresql://ytsession:ytsession123@postgres:5432/ytsession
   API_URL=http://<casaos-ip>:3000
   AI_API_KEY=sk-proj-YOUR-ACTUAL-KEY
   ```

4. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

5. **Access the app:**
   - `http://<casaos-ip>:5173` (Frontend)
   - `http://<casaos-ip>:3000` (Backend API)

---

## Method 3: Create a CasaOS App Package

For easier distribution, create a CasaOS app configuration:

```yaml
# filepath: casa-config.yml
name: YT Insight
icon: https://your-domain.com/icon.png
tagline: AI-Powered YouTube Video Analyzer
category: Media
port_map: "5173"

x-casaos:
  architectures:
    - amd64
    - arm64
  main: frontend
  author: Your Name
  category: Media
  description:
    en_us: Download YouTube subtitles, analyze with AI, and extract insights
  developer: Your Name
  icon: https://your-domain.com/icon.png
  screenshot_link:
    - https://your-domain.com/screenshot.png
  tagline:
    en_us: AI-Powered YouTube Analyzer
  thumbnail: https://your-domain.com/thumb.png
  title:
    en_us: YT Insight
  index: /
  port_map: "5173"

services:
  postgres:
    image: postgres:15-alpine
    container_name: yt_insight_db
    environment:
      POSTGRES_USER: ytsession
      POSTGRES_PASSWORD: ytsession123
      POSTGRES_DB: ytsession
    volumes:
      - /DATA/AppData/yt-insight/postgres:/var/lib/postgresql/data
    restart: unless-stopped
    x-casaos:
      volumes:
        - container: /var/lib/postgresql/data
          description: Database storage
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ytsession"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: yt_insight_backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://ytsession:ytsession123@postgres:5432/ytsession
      AI_API_KEY: ${AI_API_KEY}
      NODE_ENV: production
    ports:
      - "3000:3000"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: yt_insight_frontend
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://backend:3000
    ports:
      - "5173:5173"
    restart: unless-stopped
    x-casaos:
      ports:
        - container: "5173"
          description: Web Interface
          protocol: tcp
```

---

## CasaOS-Specific Considerations

### 1. Persistent Data Location
CasaOS stores app data in `/DATA/AppData/`. Update volumes:
```yaml
volumes:
  - /DATA/AppData/yt-insight/postgres:/var/lib/postgresql/data
```

### 2. Network Access
- CasaOS uses Traefik for reverse proxy
- You may need to configure hostname in CasaOS settings
- Access via: `http://casaos.local:5173` or `http://<server-ip>:5173`

### 3. Environment Variables
CasaOS UI lets you set env vars without editing `.env`:
- Go to App Settings → Environment
- Add `AI_API_KEY` there

### 4. Auto-Updates
CasaOS can auto-update if you publish images to Docker Hub:
```yaml
image: yourusername/yt-insight-backend:latest
image: yourusername/yt-insight-frontend:latest
```

---

## ⚠️ Security Best Practices

1. **Never commit `.env` to Git** - Already in .gitignore
2. **Use strong passwords** - Change default `POSTGRES_PASSWORD`
3. **Rotate API keys** if exposed - Get new keys from https://platform.openai.com/api-keys
4. **Use the placeholder in `.env.example`:**
   ```env
   AI_API_KEY=your_openai_api_key_here
   ```

---

## Simplified User Instructions for CasaOS

### Quick Start

1. **SSH into your CasaOS server:**
   ```bash
   ssh root@casaos.local
   ```

2. **Clone the repository:**
   ```bash
   cd /DATA/AppData
   git clone https://github.com/yourusername/yt-insight.git
   cd yt-insight
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Add your OpenAI API key to `.env`:**
   ```env
   AI_API_KEY=sk-proj-your-actual-key-here
   ```

5. **Start the app:**
   ```bash
   docker-compose up -d
   ```

6. **Access the application:**
   - Frontend: `http://your-casaos-ip:5173`
   - Backend API: `http://your-casaos-ip:3000`

### Configuration in CasaOS UI

After installation, you can manage the app through CasaOS:
- View logs
- Stop/Start/Restart containers
- Update environment variables
- Monitor resource usage

---

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Can't access from other devices
- Ensure ports 5173 and 3000 are not blocked by firewall
- Check that `0.0.0.0` is used in port bindings
- Verify CasaOS network settings

### Database connection errors
- Wait 30 seconds for PostgreSQL to fully initialize
- Check DATABASE_URL in .env matches docker-compose.yml
- Verify postgres container is healthy: `docker ps`

### AI features not working
- Verify `AI_API_KEY` is set correctly in .env
- Check backend logs for API errors: `docker-compose logs backend`
- Test API key at https://platform.openai.com/playground

---

## Network Access Configuration

To make the app accessible from other devices on your network, the docker-compose.yml already binds to `0.0.0.0`:

```yaml
ports:
  - "0.0.0.0:5173:5173"  # Frontend
  - "0.0.0.0:3000:3000"  # Backend
```

Access from any device on your network:
- `http://<casaos-ip>:5173` - Main application
- `http://<casaos-ip>:3000/health` - Backend health check

---

## Summary

CasaOS users should:
1. Clone your repo to `/DATA/AppData/`
2. Create a `.env` file from `.env.example`
3. Add their OpenAI API key
4. Run `docker-compose up -d`
5. Access the app at `http://casaos-ip:5173`

The app will then appear in the CasaOS dashboard and can be managed through the web UI!
