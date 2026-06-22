# Rami App - Build & Deploy Instructions

## Prerequisites

### For iOS (Apple App Store)
1. **Mac with Xcode** (required for iOS builds)
2. **Apple Developer Account** ($99/year) — https://developer.apple.com
3. **Xcode Command Line Tools**
4. **Node.js 16+** — https://nodejs.org

### For Android (Google Play Store)
1. **Android Studio** or **Android SDK** — https://developer.android.com/studio
2. **Java Development Kit (JDK) 11+**
3. **Google Play Developer Account** ($25 one-time)
4. **Node.js 16+**

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Initialize Capacitor (first time only)
```bash
npx cap init --web-dir . --package-id com.Yahya.Rami --app-name Rami
```

## Building for iOS (App Store)

### 1. Add iOS platform
```bash
npx cap add ios
```

### 2. Open in Xcode
```bash
npx cap open ios
```

### 3. Configure in Xcode
- Select project "Rami" in the Project Navigator
- Go to **Signing & Capabilities**
- Select your team (under Development Team)
- Update Bundle Identifier if needed: `com.Yahya.Rami`

### 4. Build & Archive
- Product → Scheme → Select "Rami"
- Product → Destination → Select "Any iOS Device"
- Product → Archive
- When finished, click "Distribute App"

### 5. Submit to App Store
- Choose "App Store Connect"
- Sign in with your Apple ID (yahya.hussein2005@icloud.com)
- Follow the submission wizard
- You'll need:
  - App name: **Rami**
  - Bundle ID: **com.Yahya.Rami**
  - Version: Start with **1.0.0**
  - Description: "Read a story. Tell it back. Keep the lesson."
  - Screenshots (at least 2, from different devices)
  - Privacy Policy URL (required)
  - Support URL (optional but recommended)

## Building for Android (Play Store)

### 1. Add Android platform
```bash
npx cap add android
```

### 2. Open in Android Studio
```bash
npx cap open android
```

### 3. Configure signing
- File → Project Structure → Modules → app
- Signing Configs tab
- Create a signing key for production

### 4. Build signed APK/AAB
- Build → Build Bundle(s) / APK(s)
- Select "Release"
- Sign with your production key

### 5. Submit to Google Play
- Go to https://play.google.com/console
- Create new app: **Rami**
- Package name: **com.Yahya.Rami**
- Fill in store listing details
- Upload signed bundle
- Submit for review

## Sync Data with Cloud (Optional)

Currently, your stories are stored locally on each device. To add cloud sync:

1. Integrate with Firebase or Supabase
2. Sign in with Apple ID / Google Account
3. Stories sync across devices

Ask if you'd like help setting this up!

## Local Development (Testing)

To test before building:
```bash
# Start a local server
npm run dev

# Open browser to http://localhost:8000
```

## Troubleshooting

**"Xcode not found"** → Install Xcode from App Store or Command Line Tools
**"Android SDK not found"** → Set ANDROID_SDK_ROOT environment variable
**"Team ID not set"** → Sign in to Xcode with your Apple Developer account

## Support

For detailed docs:
- Capacitor iOS: https://capacitorjs.com/docs/ios
- Capacitor Android: https://capacitorjs.com/docs/android
- App Store Connect Help: https://developer.apple.com/help/app-store-connect
- Google Play Help: https://support.google.com/googleplay/android-developer
