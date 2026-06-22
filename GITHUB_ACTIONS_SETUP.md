# GitHub Actions Setup - Build Rami Automatically

This guide will help you set up automated builds for iOS and Android using GitHub's free CI/CD service.

## Prerequisites

1. **GitHub Account** (free) — https://github.com
2. **Apple Developer Account** ($99/year) — for iOS builds
3. **Google Play Developer Account** ($25) — for Android builds
4. Your code pushed to a GitHub repository

---

## Step 1: Push Code to GitHub

```bash
cd /path/to/RAWI

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: Rami app ready for cloud builds"

# Add GitHub as remote (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR_USERNAME/rami.git
git branch -M main
git push -u origin main
```

Get your repo URL from GitHub after creating it.

---

## Step 2: iOS Setup (Apple)

### Generate Apple Signing Certificate

You need a signing certificate to build iOS apps. Do this on ANY Mac (borrowed from a friend counts!):

```bash
# On a Mac:
1. Open Keychain Access
2. Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority
3. Email: yahya.hussein2005@icloud.com
4. Name: Rami Code Signing
5. Save to disk
6. Go to developer.apple.com > Account > Certificates
7. Create "iOS App Development" certificate using the CSR file
8. Download the .cer file
9. Double-click to add to Keychain
10. Right-click certificate > Export > Save as .p12 file (set a password!)
```

### Add to GitHub Secrets

In your GitHub repo:
1. Settings → Secrets and variables → Actions
2. Click "New repository secret"

Add these secrets:

| Secret Name | Value |
|---|---|
| `APPLE_ID` | yahya.hussein2005@icloud.com |
| `APPLE_APP_PASSWORD` | [App-specific password from Apple ID settings] |
| `APPLE_CERTIFICATE_BASE64` | [Convert .p12 file to base64] |
| `APPLE_CERTIFICATE_PASSWORD` | [Password you set for .p12] |
| `KEYCHAIN_PASSWORD` | [Any secure password - GitHub generates temp keychain] |

### How to Convert .p12 to Base64

On Mac or Linux:
```bash
base64 -i certificate.p12 -o certificate.txt
# Then paste contents of certificate.txt as APPLE_CERTIFICATE_BASE64
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("certificate.p12")) | Set-Clipboard
# Paste from clipboard as APPLE_CERTIFICATE_BASE64
```

### Generate App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in with yahya.hussein2005@icloud.com
3. Security section → App-specific passwords
4. Generate password for "Rami App"
5. Use this as `APPLE_APP_PASSWORD` secret

---

## Step 3: Android Setup (Google Play)

### Generate Keystore File

```bash
# On Windows, Mac, or Linux:
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias rami \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD

# Fill in:
# First/Last Name: Rami App
# Organization: Personal
# City: Your City
# State: Your State
# Country: US
```

### Convert Keystore to Base64

```bash
# Mac/Linux:
base64 -i release.keystore -o keystore.txt

# Windows PowerShell:
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
```

### Add to GitHub Secrets

1. Settings → Secrets and variables → Actions
2. Add these secrets:

| Secret Name | Value |
|---|---|
| `ANDROID_KEYSTORE_FILE` | [contents of keystore.txt - base64 encoded] |
| `ANDROID_KEYSTORE_PASSWORD` | YOUR_STORE_PASSWORD |
| `ANDROID_KEY_PASSWORD` | YOUR_KEY_PASSWORD |
| `ANDROID_KEY_ALIAS` | rami |

### Generate Google Play Service Account

1. Go to https://play.google.com/console
2. Settings → API access → Create Service Account
3. Follow Google Cloud instructions
4. Download JSON key file
5. Convert to base64 (same as above)
6. Add as `ANDROID_SERVICE_ACCOUNT_JSON` secret

---

## Step 4: Create ExportOptions.plist (iOS)

Create this file in your repo: `ios/App/ExportOptions.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>bundleIdentifier</key>
    <string>com.Yahya.Rami</string>
</dict>
</plist>
```

Get YOUR_TEAM_ID from: https://developer.apple.com/account (under Account settings)

---

## Step 5: Trigger Builds

### Build on Push (Every time you push to GitHub)

The workflows automatically run on every push to `main` branch.

### Build Specific Version (Release)

Create a release/tag to trigger versioned builds:

```bash
# Tag a version (this triggers the build)
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will:
# 1. Build iOS app
# 2. Build Android app
# 3. Upload to App Store (if configured)
# 4. Create release page with download links
```

### Manual Trigger (GitHub UI)

1. Go to your repo
2. Actions tab
3. Select workflow (Build iOS / Build Android)
4. Click "Run workflow"
5. Select branch: main
6. Click green "Run workflow" button

---

## Step 6: Monitor Builds

1. Go to your GitHub repo
2. Click "Actions" tab
3. Watch real-time build logs
4. When complete, download artifacts or check releases

---

## Step 7: Submit to App Stores

### iOS App Store

Once build succeeds:
1. Go to https://appstoreconnect.apple.com
2. My Apps → Rami
3. The iOS build should appear in "Builds"
4. Follow APP_STORE_CHECKLIST.md to submit

### Google Play

Builds are automatically uploaded to "Internal Testing" track.
1. Go to https://play.google.com/console
2. Select "Rami" app
3. Release → Internal Testing
4. Click the latest build
5. Review and promote to "Closed Testing" then "Production"

---

## Troubleshooting

### "Build failed - Certificate error"
- Verify `APPLE_CERTIFICATE_BASE64` is correctly encoded
- Check certificate isn't expired
- Make sure password is correct

### "Android build failed - Keystore error"
- Verify keystore is correctly base64 encoded
- Check passwords match exactly
- Ensure alias matches `ANDROID_KEY_ALIAS`

### "Permission denied" on Google Play upload
- Verify service account has proper permissions
- Regenerate service account JSON
- Re-encode and update secret

### "App ID not found"
- Ensure app is created in App Store Connect
- Verify bundle ID matches: `com.Yahya.Rami`
- Wait a few minutes for App Store to sync

---

## Update App Version

To release a new version:

```bash
# Edit version in capacitor.config.json
# Change: "appVersion": "1.0.1"

git add capacitor.config.json
git commit -m "Bump version to 1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1

# GitHub Actions builds and submits automatically!
```

---

## Next Steps

1. Create GitHub account if you don't have one
2. Create repository (private or public)
3. Follow iOS setup (need to borrow a Mac for certificates)
4. Follow Android setup
5. Push code to GitHub
6. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
7. Watch Actions tab for build progress
8. Download or submit to app stores!

---

**Questions?** Check the GitHub Actions logs — they're very detailed and usually show exactly what went wrong.
