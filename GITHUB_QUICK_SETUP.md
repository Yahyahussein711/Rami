# GitHub Actions - 5-Minute Quick Setup

## The Idea
Push code to GitHub → GitHub's computers automatically build your iOS/Android apps → Download or auto-submit to App Stores

## What You Need

✅ GitHub account (free)  
✅ Apple Developer ($99/year) for iOS  
✅ Google Play Developer ($25) for Android  
✅ A borrowed Mac for 30 minutes (iOS certificate only)  

## 3 Main Steps

### 1. Get Your Code on GitHub
```bash
git init
git add .
git commit -m "Rami app"
git remote add origin https://github.com/YOUR_USERNAME/rami.git
git push -u origin main
```

### 2. Generate Signing Files
- **iOS:** Borrow a Mac, generate certificate, download .p12 file
- **Android:** Run `keytool` command, generates `release.keystore`

### 3. Add Secrets to GitHub
GitHub Settings → Secrets → Add:
- `APPLE_ID` = yahya.hussein2005@icloud.com
- `APPLE_CERTIFICATE_BASE64` = [.p12 as base64]
- `ANDROID_KEYSTORE_FILE` = [.keystore as base64]
- [8 more secrets - see GITHUB_ACTIONS_SETUP.md]

## Trigger a Build

**Option A:** Just push code
```bash
git commit -m "Update stories"
git push origin main
# Build starts automatically!
```

**Option B:** Create a release
```bash
git tag v1.0.0
git push origin v1.0.0
# Build + auto-submit to App Stores!
```

## Track Build

1. Go to your GitHub repo
2. Click "Actions" tab
3. Watch build in real-time
4. Get download links when done

## What Happens

```
You push code
    ↓
GitHub Actions sees push
    ↓
Runs build-ios.yml on Mac runner
    ↓
Runs build-android.yml on Linux runner
    ↓
Signs apps with your certificates
    ↓
Uploads to App Store Connect + Google Play
    ↓
You download APK/IPA or auto-submit
```

## Time Investment

- Setup (first time): 2-3 hours (mostly waiting for Mac access)
- Each build after: 20-30 minutes (automatic)
- Your time per release: 5 minutes (just push code!)

---

**Full guide:** See GITHUB_ACTIONS_SETUP.md
