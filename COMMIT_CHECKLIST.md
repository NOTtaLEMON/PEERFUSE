# 🔒 Pre-Commit Security Checklist

Use this checklist before committing code to ensure no secrets are exposed.

## ✅ Before Every Commit

### 1. Check for Hardcoded Secrets
```bash
# Search for potential API keys in staged files
git diff --cached | grep -i "api[_-]\?key"
git diff --cached | grep -i "AIza"
git diff --cached | grep -i "secret"
```

**Expected Result:** No matches (or only references to environment variables)

### 2. Verify .env is Ignored
```bash
# Check if .env is in .gitignore
git check-ignore -v backend/.env
```

**Expected Result:** `.gitignore:XX:.env    backend/.env`

### 3. Check Git Status
```bash
git status
```

**Verify:**
- [ ] `.env` is NOT listed in untracked files
- [ ] `.env` is NOT listed in changes to be committed
- [ ] Only intended files are staged

### 4. Review Staged Changes
```bash
# View all changes about to be committed
git diff --cached
```

**Look for:**
- [ ] No actual API keys (format: `AIza...` or long alphanumeric strings)
- [ ] No passwords or secrets
- [ ] Only `os.getenv()` calls for sensitive data

### 5. Check Specific Files
```bash
# Check backend files
cat backend/app.py | grep -i "AIza"
cat backend/app.py | grep -E "api.*key.*=.*['\"][A-Za-z0-9]{30,}"

# Check frontend files
cat js/config.js | grep -i "AIza"
```

**Expected Result:** No matches (or only comments/documentation)

## ✅ Before First Push (One-Time)

### 1. Verify .gitignore is Committed
```bash
git ls-files | grep .gitignore
```

**Expected Result:**
```
.gitignore
backend/.gitignore
```

### 2. Verify .env.example Exists (Template Only)
```bash
git ls-files | grep .env
```

**Expected Result:**
```
backend/.env.example
```

**Should NOT include:** `.env` (actual file with real keys)

### 3. Check for Accidentally Committed Secrets
```bash
# Search entire repository history
git log -p | grep -i "AIza"
git log -p | grep -E "api.*key.*=.*['\"][A-Za-z0-9]{30,}"
```

**Expected Result:** No matches

### 4. Verify Documentation
```bash
# Check that security docs exist
ls -la SECURITY.md
ls -la backend/README.md
ls -la REFACTORING_SUMMARY.md
```

**All should exist**

## ✅ After Making Changes

### If You Modified .env Handling
```bash
# Test that API key is loaded from environment
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('✅ OK' if os.getenv('GOOGLE_API_KEY') else '❌ FAILED')"
```

**Expected Result:** `✅ OK`

### If You Modified API Endpoints
```bash
# Test the server
python backend/app.py &
sleep 2
curl http://localhost:5000/health
kill %1
```

**Expected Result:** `{"status": "ok", ...}`

## 🚨 If You Find a Problem

### Found Hardcoded Secret in Staged Files
```bash
# Unstage the file
git reset HEAD path/to/file.py

# Fix the file (use environment variables)
nano path/to/file.py

# Stage the corrected version
git add path/to/file.py
```

### Found .env in Staged Files
```bash
# Unstage immediately
git reset HEAD backend/.env

# Verify .env is in .gitignore
echo "backend/.env" >> .gitignore
git add .gitignore
```

### Already Committed (But Not Pushed)
```bash
# Remove from last commit
git rm --cached backend/.env
git commit --amend -m "Remove .env file"
```

### Already Pushed to GitHub
**⚠️ CRITICAL - Follow these steps:**

1. **Immediately revoke the exposed API key:**
   - Gemini: https://aistudio.google.com/app/apikey
   - Firebase: https://console.firebase.google.com

2. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/.env" \
     --prune-empty -- --all
   git push origin --force --all
   ```

3. **Generate new key and add to .env locally**

4. **See SECURITY.md for detailed recovery steps**

## ✅ Final Checklist Before Push

- [ ] No `.env` files in Git
- [ ] No hardcoded API keys
- [ ] All secrets use `os.getenv()`
- [ ] `.gitignore` includes `.env`
- [ ] Only `.env.example` is committed
- [ ] Documentation is up to date
- [ ] Tests pass (if applicable)
- [ ] Code review completed

## 🔍 Automated Tools (Optional)

### Install git-secrets
```bash
# Prevents committing secrets
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets
make install
git secrets --install
git secrets --register-aws
```

### Install pre-commit
```bash
pip install pre-commit
# Create .pre-commit-config.yaml
pre-commit install
```

## 📚 Resources

- Full security guide: `SECURITY.md`
- Backend setup: `backend/README.md`
- Quick reference: `backend/QUICKSTART.md`

---

**Remember:** It's easier to prevent than to fix! Always check before committing.

✅ **When in doubt, check this list!**
