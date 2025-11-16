# CI/CD Setup Guide - Quick Start

This is a **step-by-step guide** to set up the GitHub Actions workflow we built for this project.

## 📋 Prerequisites

- [ ] GitHub repository created
- [ ] Supabase project created
- [ ] Local development environment working

---

## 🚀 Step 1: Install Dependencies

First, make sure you have the coverage package installed:

```bash
npm install
```

This will install `@vitest/coverage-v8` that we added to `package.json`.

---

## 🔧 Step 2: Create Test User in Supabase

You need a dedicated test user for E2E tests.

### Option A: Using Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click **Authentication** in left sidebar
4. Click **Users** tab
5. Click **Add user** → **Create new user**
6. Fill in:
   - **Email**: `e2e-test@yourdomain.com` (or any email)
   - **Password**: Create a strong password
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (important!)
7. Click **Create user**
8. Save the email and password - you'll need them for GitHub Secrets

### Option B: Using SQL Editor

```sql
-- In Supabase SQL Editor
-- Note: This creates auth user, password will be what you set
-- Replace with your actual test email and password
```

---

## 🔐 Step 3: Configure GitHub Secrets

### 3.1 Navigate to Secrets Settings

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. In left sidebar: **Secrets and variables** → **Actions**
4. Click **New repository secret**

### 3.2 Add Required Secrets

Add these secrets one by one:

#### Secret 1: `PUBLIC_SUPABASE_URL`
```
Name:  PUBLIC_SUPABASE_URL
Value: https://your-project-id.supabase.co
```
**Where to find:** Supabase Dashboard → Settings → API → Project URL

---

#### Secret 2: `PUBLIC_SUPABASE_ANON_KEY`
```
Name:  PUBLIC_SUPABASE_ANON_KEY
Value: your-anon-key-here (long string starting with "eyJ...")
```
**Where to find:** Supabase Dashboard → Settings → API → Project API keys → `anon` `public`

---

#### Secret 3: `E2E_USERNAME`
```
Name:  E2E_USERNAME
Value: e2e-test@yourdomain.com
```
**This is:** The email of the test user you created in Step 2

---

#### Secret 4: `E2E_PASSWORD`
```
Name:  E2E_PASSWORD
Value: your-test-user-password
```
**This is:** The password of the test user you created in Step 2

---

#### Secret 5 (Optional): `CODECOV_TOKEN`
```
Name:  CODECOV_TOKEN
Value: your-codecov-token
```
**Only if using Codecov.io** - Skip this if you don't want coverage tracking online.

**Where to find:**
1. Go to https://codecov.io
2. Sign in with GitHub
3. Add your repository
4. Copy the token

---

### 3.3 Verify Secrets

After adding, you should see:
```
✓ PUBLIC_SUPABASE_URL
✓ PUBLIC_SUPABASE_ANON_KEY
✓ E2E_USERNAME
✓ E2E_PASSWORD
✓ CODECOV_TOKEN (optional)
```

---

## 🌍 Step 4: Create GitHub Environment

GitHub Environments allow you to group secrets and add protection rules.

### 4.1 Create Environment

1. Go to your GitHub repository
2. Click **Settings** → **Environments** (in left sidebar)
3. Click **New environment**
4. Name: `fishkiAI`
5. Click **Configure environment**

### 4.2 Configure Environment (Optional but Recommended)

You can add protection rules:

**Environment protection rules:**
- [ ] **Required reviewers** - Require someone to approve before running E2E tests
- [ ] **Wait timer** - Add a delay before running
- [ ] **Deployment branches** - Limit which branches can use this environment

For most projects, you can skip protection rules.

### 4.3 Environment Secrets (Alternative)

Instead of repository secrets, you can add secrets directly to the environment:

1. In the `fishkiAI` environment page
2. Scroll to **Environment secrets**
3. Add the same secrets here

**Repository secrets vs Environment secrets:**
- **Repository secrets**: Available to all workflows
- **Environment secrets**: Only available when workflow uses that environment
- **Recommendation**: Use repository secrets for simplicity (unless you have multiple environments)

---

## ✅ Step 5: Verify Setup Locally

Before pushing, test everything works locally:

```bash
# Copy example env file
cp .env.example .env.test

# Edit .env.test and fill in your values
# (Use the same values as your GitHub Secrets)
```

Edit `.env.test`:
```bash
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PORT=3001
E2E_USERNAME=e2e-test@yourdomain.com
E2E_PASSWORD=your-test-password
```

Then test each step:

```bash
# 1. Test linting
npm run lint
npm run format:check

# 2. Test unit tests with coverage
npm run test:coverage

# 3. Test E2E (this will start dev server)
npm run test:e2e
```

**Expected output:**
- Lint: Should pass ✅
- Unit tests: Should show coverage report ✅
- E2E tests: Should login and create set ✅

**If any fail:** Fix them locally before pushing!

---

## 🚢 Step 6: Test the Workflow

### 6.1 Create a Test Branch

```bash
git checkout -b test-ci-setup
```

### 6.2 Make a Small Change

```bash
# Make any small change, for example:
echo "# Testing CI" >> README.md
git add README.md
git commit -m "test: verify CI/CD setup"
git push origin test-ci-setup
```

### 6.3 Create Pull Request

1. Go to your GitHub repository
2. You should see a banner: **Compare & pull request**
3. Click it
4. Base branch: `main` or `develop`
5. Compare branch: `test-ci-setup`
6. Click **Create pull request**

### 6.4 Watch the Workflow Run

1. In the PR, you'll see checks appear:
   ```
   ⏳ Lint & Format Check — In progress
   ⏳ Unit Tests — Queued
   ⏳ E2E Tests — Queued
   ⏳ Post Status Comment — Queued
   ```

2. Click **Details** next to any check to see logs

3. Wait for all checks to complete (~5-10 minutes first run)

4. You should see:
   ```
   ✅ Lint & Format Check — Passed
   ✅ Unit Tests — Passed
   ✅ E2E Tests — Passed
   ✅ Post Status Comment — Passed
   ```

5. A bot comment will appear in the PR:
   ```markdown
   ## CI/CD Status Report
   
   ✅ All checks passed successfully!
   
   ### Test Results
   
   | Job | Status |
   |-----|--------|
   | 🔍 Lint & Format | ✅ Passed |
   | 🧪 Unit Tests | ✅ Passed |
   | 🎭 E2E Tests | ✅ Passed |
   ```

---

## 🎯 Step 7: Configure Branch Protection

Protect your main branch to require CI checks before merging.

### 7.1 Enable Branch Protection

1. Go to **Settings** → **Branches**
2. Under **Branch protection rules**, click **Add rule**
3. Branch name pattern: `main` (or `develop`)

### 7.2 Configure Rules

Check these options:

#### Required:
- [x] **Require a pull request before merging**
  - [x] Require approvals: `1`
- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - Search and add these status checks:
    - `Lint & Format Check`
    - `Unit Tests`
    - `E2E Tests`

#### Recommended:
- [x] **Require conversation resolution before merging**
- [x] **Do not allow bypassing the above settings**

#### Optional:
- [ ] **Require deployments to succeed before merging**
- [ ] **Require signed commits**

### 7.3 Save

Click **Create** or **Save changes**

---

## 🔍 Troubleshooting

### Problem 1: "E2E_USERNAME and E2E_PASSWORD must be set"

**Cause:** Secrets not configured or wrong names

**Fix:**
1. Check secret names (case-sensitive!)
2. Verify secrets are in repository or environment
3. If using environment, check workflow has `environment: fishkiAI`

### Problem 2: E2E Tests Fail - "Login failed"

**Cause:** Test user doesn't exist or password wrong

**Fix:**
1. Go to Supabase → Authentication → Users
2. Find your test user
3. Check email is correct
4. Try logging in manually at your app's login page
5. If can't login, reset password or create new user
6. Update `E2E_PASSWORD` secret in GitHub

### Problem 3: E2E Tests Fail - "User email not confirmed"

**Cause:** Test user not confirmed

**Fix:**
1. Supabase → Authentication → Users
2. Find test user
3. Check **Email Confirmed** column
4. If not confirmed, click user → **Confirm email**

### Problem 4: Workflow Doesn't Start

**Cause:** Workflow file not in correct location

**Fix:**
1. Verify file is at: `.github/workflows/pull-request.yml`
2. Push to remote: `git push origin main`
3. Check **Actions** tab in GitHub

### Problem 5: "npm ci" Fails

**Cause:** package-lock.json out of sync

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "chore: regenerate package-lock.json"
git push
```

### Problem 6: Coverage Upload Fails (Codecov)

**Cause:** CODECOV_TOKEN not set or wrong

**Fix:**
- If NOT using Codecov: This is OK! It has `continue-on-error: true`
- If using Codecov: Check token is correct in secrets

### Problem 7: Workflow is Slow (15+ minutes)

**Possible causes:**
1. Playwright installing all browsers
   - **Check:** workflow uses `chromium` only
2. No caching
   - **Check:** `cache: 'npm'` in setup-node step
3. Network issues on GitHub side
   - **Wait and retry**

---

## 📊 Viewing Results

### Coverage Report

After workflow runs:

1. Go to workflow run
2. Scroll to **Artifacts** section
3. Download `unit-test-coverage`
4. Extract and open `coverage/html/index.html` in browser

### E2E Screenshots/Videos

If E2E tests fail:

1. Go to workflow run
2. Download `playwright-report` artifact
3. Extract and open `index.html`
4. See screenshots/videos of failures

### Codecov Dashboard (if configured)

1. Go to https://codecov.io
2. Find your repository
3. See coverage trends over time

---

## 🔄 Regular Maintenance

### Weekly

- [ ] Review Dependabot PRs (if enabled)
- [ ] Check failed workflows

### Monthly

- [ ] Review coverage trends
- [ ] Update outdated actions
- [ ] Rotate test user password

### Quarterly

- [ ] Audit secrets (remove unused)
- [ ] Review and optimize workflow timing
- [ ] Update Node.js version if needed

---

## 📚 Next Steps

Now that CI/CD is set up:

1. **Add more tests**: See `.ai/doc/CI-CD-lesson.md` for best practices
2. **Set up CD**: Add deployment to staging/production
3. **Add notifications**: Slack/Discord alerts
4. **Monitor performance**: Add Lighthouse CI

---

## 🆘 Getting Help

If you're stuck:

1. **Check logs**: Click "Details" on failed check
2. **Read error messages**: They usually tell you what's wrong
3. **Compare with lesson**: `.ai/doc/CI-CD-lesson.md`
4. **GitHub Actions docs**: https://docs.github.com/en/actions

---

## ✅ Checklist - Are You Done?

- [ ] All secrets configured in GitHub
- [ ] Test user created in Supabase
- [ ] `fishkiAI` environment created
- [ ] Tested locally (all commands pass)
- [ ] Created test PR
- [ ] Workflow runs successfully
- [ ] Branch protection enabled
- [ ] Bot comment appears in PR
- [ ] Can merge PR after checks pass

**If all checked:** 🎉 Your CI/CD is fully set up!

---

## 🔗 Related Documentation

- **Detailed Lesson**: `.ai/doc/CI-CD-lesson.md` - Deep dive into how everything works
- **GitHub Actions Setup**: `doc/guide/github-actions-setup.md` - Original setup doc
- **Workflow File**: `.github/workflows/pull-request.yml` - The actual workflow

---

*Last updated: 2025-11-16*

