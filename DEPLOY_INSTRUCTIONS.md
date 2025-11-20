# Deploy Support Page to Firebase Hosting

## Method 1: Using Firebase Console (Recommended - No CLI needed!)

### Step 1: Prepare the files
Your support page is already in `/public/` directory:
- `public/index.html` (main page)
- `public/support.html` (support page)

### Step 2: Create a ZIP file
1. Go to the `public` folder in Finder
2. Right-click on the `public` folder
3. Select "Compress public"
4. This creates `public.zip`

### Step 3: Deploy via Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project: `trip-planner-app-a09e5`
3. Click **"Hosting"** in the left menu
4. Click **"Get Started"** (if first time) or **"Add another site"**
5. Scroll down and you'll see **"Or drag and drop a folder here"**
6. Drag the `public` folder (or the zip) into that area
7. Click **"Deploy"**

Done! Your site will be live at: `https://trip-planner-app-a09e5.web.app`

---

## Method 2: Using Firebase CLI with Token (If you prefer terminal)

### Step 1: Get a CI Token (One-time setup)

Since interactive login isn't working, we'll use a deployment token:

**Option A: Try this command** (might work without full login):
```bash
npx firebase login:ci
```

This will give you a token. Copy it!

**Option B: If that doesn't work:**
Unfortunately, Firebase deprecated manual token generation. We'll need to use Method 1 (Firebase Console drag & drop) instead.

---

## Method 3: Use a Different Computer/Browser

If you have access to another computer or can use a different browser:

1. Install Node.js and Firebase CLI there
2. Run `firebase login`
3. Complete the verification
4. Deploy from that machine

---

## Recommended: Use Method 1 (Console Upload)

This is the easiest and doesn't require CLI login at all!
