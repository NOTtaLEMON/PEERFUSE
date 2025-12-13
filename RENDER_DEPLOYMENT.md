# PeerFuse Render Deployment Guide

## Pre-Deployment Checklist

✅ Memory optimizations applied:
- Lazy model loading (model initialized only on first request)
- Request caching (up to 50 cached responses)
- Single worker configuration
- Limited output tokens (2048 max)
- Cache auto-clearing to prevent memory overflow

✅ Files configured:
- `backend/app.py` - Optimized for low memory
- `backend/requirements.txt` - Pinned versions
- `render.yaml` - Deployment configuration
- `js/ai-tools.js` - Updated to Render URL

## Deployment Steps

### 1. Push to GitHub
```powershell
git add .
git commit -m "Optimize for Render deployment - memory efficient config"
git push origin main
```

### 2. Create Render Web Service
1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect your GitHub repository: `NOTtaLEMON/PEERFUSE`
4. Render will auto-detect `render.yaml`

### 3. Configure Environment Variables
In Render Dashboard → Environment:
- **GEMINI_API_KEY**: Get new key from https://aistudio.google.com/app/apikey
  ⚠️ **CRITICAL: NEVER commit this key to Git - set it ONLY in Render dashboard**
- **FLASK_ENV**: `production` (auto-set from render.yaml)
- **WEB_CONCURRENCY**: `1` (auto-set from render.yaml)

### 4. Deploy
- Click **Create Web Service**
- Wait 5-10 minutes for build
- Your backend URL: `https://peerfuse-backend.onrender.com`

### 5. Update Frontend (if URL differs)
If Render assigns a different URL, update `js/ai-tools.js`:
```javascript
const BACKEND_URL = 'https://YOUR-ACTUAL-URL.onrender.com';
```

### 6. Verify Deployment
Test endpoints:
- https://peerfuse-backend.onrender.com/health
- https://peerfuse-backend.onrender.com/ (root endpoint)

## Memory Optimizations Applied

### 1. Lazy Model Loading
- Model initialized on first request (not on startup)
- Saves ~100-150MB during cold start

### 2. Request Caching
- Up to 50 requests cached in memory
- Auto-clears when limit reached
- Reduces redundant API calls

### 3. Gunicorn Configuration
- 1 worker, 2 threads (minimal memory footprint)
- Max 1000 requests per worker (prevents memory leaks)
- 120s timeout (allows AI generation to complete)

### 4. Response Size Limits
- Max 2048 output tokens per response
- Prevents excessive memory usage from large responses

## Expected Performance

**Free Tier Limits:**
- 512MB RAM (optimized to fit within this)
- Spins down after 15 minutes inactivity
- Cold start: 30-60 seconds first request
- Warm requests: <5 seconds

**API Limits:**
- Gemini API: 20 requests per day (free tier)
- Rate limiting: Built-in retry with exponential backoff

## Troubleshooting

### If deployment fails with OOM:
1. Check logs in Render Dashboard
2. Reduce `MAX_CACHE_SIZE` in app.py (try 25 instead of 50)
3. Reduce `max_output_tokens` to 1024 in app.py
4. Consider upgrading to Starter plan ($7/month, 2GB RAM)

### If backend shows offline:
1. Wait 60 seconds for cold start after inactivity
2. Check Render Dashboard logs
3. Verify GEMINI_API_KEY is set correctly

### If CORS errors persist:
- CORS is set to allow all origins (`origins="*"`)
- Check GitHub Pages is using HTTPS (not HTTP)

## Cost Estimate

**Free Tier:**
- $0/month
- 512MB RAM
- 750 hours/month (enough for light usage)

**If you need more:**
- Starter: $7/month, 2GB RAM, unlimited hours
- Standard: $25/month, 4GB RAM, faster CPU

## Production Recommendations

For final deployment:
1. Upgrade to Starter plan ($7/month) for reliability
2. Implement proper CORS (whitelist only your GitHub Pages domain)
3. Add rate limiting on backend (flask-limiter)
4. Monitor memory usage in Render Dashboard
5. Consider upgrading Gemini API to paid tier (1500 RPD)
