# 🔐 SECURITY GUIDE: Protecting API Keys in PeerFuse

## ⚠️ NEVER Commit These Files

The following files contain secrets and are git-ignored:
- `backend/.env` - Contains GEMINI_API_KEY
- `js/config.local.js` - Contains Firebase config (if customized)
- Any file matching: `*.key`, `*.pem`, `*credentials*`, `*secret*`

## ✅ How to Store API Keys Safely

### 1. Local Development
```bash
# backend/.env (NEVER commit this file)
GEMINI_API_KEY=your_key_here
```

### 2. Production (Render)
- Render Dashboard → Environment tab
- Add `GEMINI_API_KEY` as environment variable
- **DO NOT** put it in code or documentation

### 3. Firebase Keys (Public)
Firebase config keys in `js/config.js` are safe to commit:
- These are PUBLIC keys meant for client-side use
- Security is enforced by Firebase Security Rules
- Still, use separate dev/prod configs if possible

## 🛡️ Protection Layers

### Layer 1: .gitignore
All sensitive files are automatically excluded:
```
.env
.env.*
config.local.js
*.key
*.pem
*credentials*
*secret*
```

### Layer 2: Pre-commit Hook
Enhanced hook at `.git/hooks/pre-commit` blocks commits containing:
- ✅ Google API keys (`AIza[...]`)
- ✅ OpenAI keys (`sk-[...]`)
- ✅ GitHub tokens (`ghp_[...]`, `gho_[...]`)
- ✅ Sensitive file patterns

### Layer 3: GitHub Secret Scanning
GitHub automatically scans pushed commits and alerts Google about leaked keys.

## 🚨 What to Do if a Key Leaks

### If You Just Committed (NOT pushed yet):
```powershell
# Remove the commit
git reset HEAD~1

# Remove the key from the file
# Edit the file to remove/move the key

# Recommit safely
git add .
git commit -m "Your message"
```

### If You Already Pushed:
1. **⚡ IMMEDIATE**: Go to https://aistudio.google.com/app/apikey
2. **Delete the leaked key** (Google may auto-revoke it)
3. **Generate a new key**
4. **Update Render** environment variables with new key
5. **Update local** `backend/.env` with new key
6. **Optional**: Remove from git history:
   ```powershell
   # Install git-filter-repo first
   git filter-repo --path backend/.env --invert-paths
   git push --force
   ```

## 🎯 Best Practices

### DO ✅
- Store keys in `.env` files (git-ignored)
- Use environment variables in production
- Generate separate keys for dev/prod
- Rotate keys periodically
- Use Render's environment variables dashboard

### DON'T ❌
- Commit `.env` files
- Put keys in code comments
- Put keys in documentation (even in code blocks)
- Share keys via Discord/Slack/email
- Use the same key across multiple projects

## 📊 Current Status

| File | Contains Secrets? | Protected? |
|------|------------------|------------|
| `backend/.env` | ✅ YES | ✅ git-ignored |
| `js/config.js` | ⚠️ Public Firebase keys | ✅ Safe to commit |
| `RENDER_DEPLOYMENT.md` | ❌ NO (placeholder only) | ✅ Safe |
| `render.yaml` | ❌ NO | ✅ Safe |

## 🔍 Testing the Hook

Try to commit a file with a pattern that looks like an API key to test:
```bash
# Create a test file with suspicious content
echo "API_KEY=test_key_here" > test.txt
git add test.txt
git commit -m "Test"
# Hook will scan and block if patterns match
```

## 📞 If You Need Help

If you accidentally leak a key:
1. Stay calm
2. Follow the steps in "What to Do if a Key Leaks"
3. The pre-commit hook will prevent future leaks
4. Consider enabling 2FA on your Google account
