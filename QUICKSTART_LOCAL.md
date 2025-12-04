# 🚀 Quick Start Guide

## To Run PeerFuse Locally

### **Option 1: Automatic (Recommended)**
1. Double-click `START_PEERFUSE.bat`
2. Wait for browser to open automatically
3. Done! ✅

### **Option 2: Manual**
1. Open terminal in project folder
2. Start backend:
   ```
   cd backend
   python app.py
   ```
3. Open NEW terminal, start frontend:
   ```
   python -m http.server 8000
   ```
4. Open browser: http://localhost:8000

---

## ⚠️ Important Notes

- **Keep terminal windows open** while using the app
- If AI features don't work, the backend isn't running
- Look for the **🟢 Backend Online** indicator in the top right
- If you see **🔴 Backend Offline**, click it for help

---

## 🔧 Troubleshooting

### "Backend Offline" message appears
→ Run `START_PEERFUSE.bat`

### AI features not working
→ Check that both terminal windows are still open
→ Refresh the page

### Port already in use
→ Close any existing Python/Flask processes
→ Try again

---

## 📁 Project Structure

```
PEERFUSE/
├── START_PEERFUSE.bat    ← Double-click this to start!
├── index.html             ← Main page
├── ai-tools.html          ← AI features page
├── backend/
│   ├── app.py            ← Flask server
│   └── .env              ← API keys (do not share!)
└── js/
    └── ai-tools.js       ← AI frontend code
```

---

## 🌐 Deployment

The site is deployed at: https://nottalemon.github.io/PEERFUSE/

**Note:** AI features only work locally (backend required)
