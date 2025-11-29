# Security Policy

## 🔐 Secure Configuration Guide

### API Key Management

PeerFuse uses environment variables to keep API keys secure and prevent accidental exposure.

### Setting Up Environment Variables

#### Backend (Flask/Python)

1. **Copy the example file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Add your API key to `.env`:**
   ```env
   GOOGLE_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Verify `.env` is in `.gitignore`:**
   ```bash
   cat .gitignore | grep .env
   ```
   Should show: `.env`

4. **Never commit `.env` to Git:**
   ```bash
   git status
   # .env should NOT appear in untracked files
   ```

### Getting API Keys

#### Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key and add to `backend/.env`
4. **Keep this key private!**

#### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Project Settings → General
3. Scroll to "Your apps" → Select Web App
4. Copy the config object to `js/config.js`

**Note:** Firebase web config is safe to expose publicly (it's meant for client-side use), but enable Firebase Security Rules to protect your data.

## 🚨 If You Accidentally Expose a Secret

### Step 1: Revoke the Compromised Key Immediately

**For Gemini API:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Delete the exposed key
3. Generate a new key

**For Firebase:**
1. Go to Firebase Console → Project Settings
2. Regenerate any exposed secrets
3. Update Security Rules to restrict access

### Step 2: Remove from Git History

If you committed a file with secrets:

```bash
# Remove the file from Git's cache
git rm --cached backend/.env

# Commit the removal
git commit -m "Remove exposed API key from version control"

# Push to remote
git push origin main
```

For more thorough cleanup (removes from all history):

```bash
# Using git filter-branch (careful!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to overwrite remote history
git push origin --force --all
```

**⚠️ Warning:** Force pushing rewrites history and affects all collaborators!

### Step 3: Add New Key Locally

```bash
# Create new .env file
cd backend
cp .env.example .env

# Add the NEW API key
echo "GOOGLE_API_KEY=your_new_key_here" > .env
```

### Step 4: Verify Security

```bash
# Check .env is not tracked
git status

# Verify .gitignore works
git check-ignore -v .env
# Should output: .gitignore:12:.env    .env
```

## 🛡️ Security Checklist

### Before Committing Code

- [ ] No API keys in source code
- [ ] `.env` file is in `.gitignore`
- [ ] No hardcoded passwords or secrets
- [ ] Firebase Security Rules are configured
- [ ] Sensitive data is not logged to console

### Before Deploying

- [ ] `debug=False` in Flask production mode
- [ ] CORS restricted to your domain
- [ ] Rate limiting enabled on API endpoints
- [ ] HTTPS enabled on all endpoints
- [ ] Environment variables configured on hosting platform

### Regular Maintenance

- [ ] Rotate API keys every 90 days
- [ ] Review Firebase Security Rules monthly
- [ ] Monitor API usage for anomalies
- [ ] Keep dependencies updated (`pip list --outdated`)
- [ ] Review access logs

## 🔍 What's Safe to Commit?

### ✅ Safe to Commit
- `.env.example` (template with placeholder values)
- Source code without secrets
- Firebase web config (client-side config object)
- Documentation and READMEs
- `.gitignore` file

### ❌ Never Commit
- `.env` (actual environment variables)
- Files with "private", "secret", "key" in the name
- Database exports with user data
- Any file containing actual API keys
- Firebase service account credentials

## 📚 Resources

### Documentation
- [Google Gemini API Security](https://ai.google.dev/docs/api_key_security)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

### Tools
- [git-secrets](https://github.com/awslabs/git-secrets) - Prevents committing secrets
- [TruffleHog](https://github.com/trufflesecurity/truffleHog) - Scans for secrets in repos
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

## 🐛 Reporting Security Issues

If you discover a security vulnerability in PeerFuse:

1. **Do NOT** open a public issue
2. Email the maintainers privately
3. Provide details about the vulnerability
4. Allow time for the issue to be patched before public disclosure

## 📞 Contact

For security concerns, contact the repository owner through GitHub.

---

**Last Updated:** November 2025  
**Version:** 1.0
