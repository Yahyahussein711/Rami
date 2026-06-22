# Rami - App Store Submission Checklist

## Before You Start
- [ ] Apple Developer Account active (paid $99/year)
- [ ] Mac with Xcode installed
- [ ] App ID created in App Store Connect (https://appstoreconnect.apple.com)

## App Store Connect Setup
- [ ] Create new app: "Rami"
- [ ] Bundle ID: `com.Yahya.Rami`
- [ ] Primary Language: English
- [ ] Category: Education (or Lifestyle)

## App Information
- [ ] App Name: **Rami**
- [ ] Subtitle: "Read. Reflect. Remember."
- [ ] Description:
```
Rami helps you engage deeply with stories and ideas.

Read a story, then pause to reconstruct it from memory—this makes it stick. Write your own lesson before seeing what others learned. Keep what resonates.

• Beautiful, distraction-free reading
• Memory-first learning approach
• Personal shelf of lessons you've drawn
• Add your own stories
• Works offline
```

## Screenshots (2 required, up to 5 recommended)
- [ ] Screenshot 1: Library view (showing story cards)
- [ ] Screenshot 2: Reading view + completion
- [ ] Screenshot 3: Your shelf (kept lessons)
- [ ] Screenshot 4: Add story screen
- [ ] Screenshot 5: Lesson recall experience

**Pro tip:** Use iPhone 14 Pro (460x1000px) for clearest results

## Preview Video (Optional but Recommended)
- [ ] 15-30 second video showing the flow: Read → Recall → Lesson

## Keywords (100 characters max)
```
stories, learning, education, reading, personal development, notes, journaling
```

## Support URL
- [ ] Create a simple support page or use: `yahyaabdirashid2004@gmail.com`

## Privacy Policy
- [ ] Create privacy policy at: https://www.privacypolicygenerator.info/
- [ ] Host at your own domain or use a free service
- [ ] Must disclose:
  - How you store user data (local on-device + optional cloud backup)
  - What data you collect (none currently)
  - Contact: yahyaabdirashid2004@gmail.com

## Availability
- [ ] Regions: Select all or target regions
- [ ] Make Available on Date: Now (or schedule for launch day)

## Pricing
- [ ] Price Tier: Free
- [ ] Auto-renewable Subscriptions: None (or add "Premium" later)

## Content Rating
- [ ] Answer all content rating questions
- [ ] Likely: 4+ years (it's educational stories)

## Build Information
Before uploading:

### 1. On Your Mac:
```bash
cd /path/to/RAWI
npm install
npx cap add ios
npx cap open ios
```

### 2. In Xcode:
- [ ] Select Rami project
- [ ] Go to Signing & Capabilities
- [ ] Select your Team
- [ ] Update Version to 1.0.0
- [ ] Update Build to 1
- [ ] Product → Archive

### 3. Submit:
- [ ] Click "Distribute App"
- [ ] Select "App Store Connect"
- [ ] Select "Upload"
- [ ] Choose distribution certificate
- [ ] Upload

## App Review Guidelines Compliance
- [ ] No crashes or bugs (test thoroughly!)
- [ ] All buttons and features work
- [ ] No broken links
- [ ] Respects user privacy
- [ ] Appropriate content (all educational stories)
- [ ] Offline functionality works
- [ ] Launch screen displays properly

## After Submission
- [ ] Check email for review status
- [ ] Apple typically reviews within 24-48 hours
- [ ] If rejected, fix issues and resubmit
- [ ] When approved, manage release via App Store Connect

## Launch Day
- [ ] Set a release date
- [ ] Share link: https://apps.apple.com/app/rami/[your-app-id]
- [ ] Update social media, email, website

## Version Updates
For future updates (1.1, 1.2, etc.):
1. Update version in Xcode
2. Update BUILD_INSTRUCTIONS notes in changelog
3. Archive and submit same way
4. Apple reviews in 24-48 hours

---

**Questions?** Email: yahyaabdirashid2004@gmail.com
