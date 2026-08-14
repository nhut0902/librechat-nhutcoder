# NhutCoder LibreChat — AI Studio with Zernio + Composio + Cloudinary MCP

Self-hosted LibreChat deployment with **3 MCP servers** pre-configured for AI agents to:
1. **Post to social media** (TikTok, Facebook, Instagram, YouTube, LinkedIn, Twitter, Threads) via Zernio
2. **Automate tasks** across 1000+ apps (Gmail, Slack, Notion, GitHub, Calendar...) via Composio
3. **Upload images to Cloudinary** and get direct URLs for embedding in posts

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  LibreChat (librechat/librechat:latest)              │
│  ├─ librechat.yaml                                   │
│  │   ├─ mcpServers:                                  │
│  │   │   ├─ zernio  → mcp.zernio.com/mcp             │
│  │   │   ├─ composio → mcp.composio.dev/mcp          │
│  │   │   └─ cloudinary-asset-mgmt                    │
│  │   └─ endpoints: OpenAI, Anthropic, Google, Groq,  │
│  │       OpenRouter (user_provided keys)             │
│  ├─ .env (secrets baked in)                          │
│  └─ MongoDB Atlas (external, free M0)                │
└──────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Wraps `librechat/librechat:latest` + copies `librechat.yaml` + `.env` |
| `librechat.yaml` | Main config — MCP servers (Zernio + Composio + Cloudinary), endpoints, permissions |
| `.env` | Secrets — JWT, Cloudinary credentials, Zernio API key (Composio + Mongo to fill) |
| `render.yaml` | Render Blueprint — Docker runtime, env vars, healthcheck |

## Pre-requisites

### 1. MongoDB Atlas (REQUIRED)
LibreChat needs MongoDB. Render does NOT provide MongoDB.

1. Go to https://cloud.mongodb.com → signup (free)
2. Create **M0 Free** cluster (512MB — enough for personal use)
3. Database Access → Add user: `librechat` / strong password
4. Network Access → Allow `0.0.0.0/0` (Render uses dynamic IPs)
5. Connect → "Drivers" → copy connection string:
   ```
   mongodb+srv://librechat:<password>@cluster0.xxxxx.mongodb.net/LibreChat
   ```
6. Set this as `MONGO_URI` env var in Render dashboard.

### 2. Composio API key (optional)
For Composio MCP (1000+ app automation):
1. Go to https://composio.dev → signup
2. Settings → API Keys → create
3. Set `COMPOSIO_API_KEY` env var in Render dashboard.

## Deploy on Render

### Option A: Blueprint (recommended)
1. Push this repo to GitHub
2. Render Dashboard → New → Blueprint → connect repo
3. Render detects `render.yaml` → creates service
4. **Set `MONGO_URI`** env var (from MongoDB Atlas)
5. Deploy

### Option B: Manual
1. New → Web Service → connect repo
2. Runtime: Docker (auto-detected)
3. Plan: **Starter** ($7/mo, 2GB RAM) — free tier will OOM
4. Health check: `/health`
5. Add env vars from `render.yaml`
6. Deploy

## MCP Servers Pre-Configured

### 1. Zernio (social media posting)
- URL: `https://mcp.zernio.com/mcp`
- Auth: `Authorization: Bearer ${ZERNIO_API_KEY}` (baked in)
- Capabilities: Post/schedule to TikTok, FB, IG, YouTube, LinkedIn, Twitter, Threads
- API key: already configured

### 2. Composio (1000+ app automation)
- URL: `https://mcp.composio.dev/mcp`
- Auth: `x-api-key: ${COMPOSIO_API_KEY}` (set after signup)
- Capabilities: Gmail, Slack, Notion, GitHub, Calendar, Linear, Jira, etc.

### 3. Cloudinary (image upload)
- URL: `https://asset-management.mcp.cloudinary.com/mcp`
- Auth: `cloudinary-url: cloudinary://${API_KEY}:${SECRET}@tfbfthxq` (baked in)
- Cloud: `tfbfthxq` (free tier)
- Capabilities: Upload images, get direct URLs, transform images

## Usage Flow (AI auto-posting)

Once LibreChat is live:

1. Open LibreChat → login with admin account (create first user after deploy)
2. Add your AI provider key (OpenAI/Anthropic/Google/Groq/OpenRouter) in Settings
3. Start a chat, enable MCP tools:
   - **Zernio**: list accounts, create/schedule posts
   - **Cloudinary**: upload image from URL → get direct link
   - **Composio**: connect Gmail/Slack/etc and run automations
4. Ask AI:
   > "Tìm ảnh cute cat trên web, upload lên Cloudinary, rồi đăng lên TikTok + Facebook với caption 'AI auto-post test'"
5. AI will:
   - Use Cloudinary MCP to upload image from URL → get direct CDN link
   - Use Zernio MCP to create post with caption + image URL
   - Publish to TikTok + Facebook simultaneously

## Live URL (after deploy)
- https://librechat-nhutcoder.onrender.com
- Update `DOMAIN_CLIENT` + `DOMAIN_SERVER` in Render env vars if URL differs

## License
LibreChat is MIT. This wrapper adds no additional restrictions.
