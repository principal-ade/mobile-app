# App Store Submission Guide

## Prerequisites

Before starting, ensure you have:
- [ ] Apple Developer Program membership ($99/year) - https://developer.apple.com/programs/
- [ ] Screenshots captured (see APP_STORE_SCREENSHOTS.md)
- [ ] Metadata ready (see APP_STORE_METADATA.md)
- [ ] Privacy policy live at https://principal-ade.com/privacy
- [ ] Terms of service live at https://principal-ade.com/terms

---

## Step 1: Create App Store Connect Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Click **Apps** in the top navigation
4. Click the **+** button → **New App**
5. Fill in the form:

| Field | Value |
|-------|-------|
| Platform | iOS |
| Name | Principal ADE |
| Primary Language | English (U.S.) |
| Bundle ID | com.noetic-labs.principal-ai-mobile |
| SKU | principal-ade-ios-001 |
| User Access | Full Access |

6. Click **Create**

---

## Step 2: Fill in App Information

### App Information Tab (left sidebar)

**Content Rights**
- Does your app contain, show, or access third-party content? → **Yes**
- You have the right to use this content → Check the box

**Age Rating**
- Click **Set Age Rating**
- Answer all questions (likely all "None" for this app)
- This should result in **4+** rating

**Category**
- Primary: **Developer Tools**
- Secondary: **Productivity** (optional)

---

## Step 3: Fill in Pricing and Availability

### Pricing and Availability Tab

**Price**
- Price Schedule → **Free**

**Availability**
- Select countries (usually all 175 countries)

---

## Step 4: Prepare the Version

### App Store Tab → iOS App → Version Information

**Screenshots**
1. Click **App Preview and Screenshots**
2. For **6.7" Display** (required): Upload 3 iPhone screenshots
3. For **12.9" Display** (if iPad supported): Upload 3 iPad screenshots
4. Drag to reorder if needed

**Promotional Text** (optional, can change anytime)
```
See GitHub commits visualized as isometric cities. A beautiful new way to follow developer activity.
```

**Description**
Copy from APP_STORE_METADATA.md

**Keywords**
```
github,commits,developer,code,visualization,repository,git,activity,programming,open source,coding
```

**Support URL**
```
https://principal-ade.com
```

**Marketing URL** (optional)
```
https://principal-ade.com
```

**Version**
```
1.0.0
```

**Copyright**
```
© 2026 Noetic Labs
```

---

## Step 5: App Review Information

### App Review Information Section

**Sign-In Information**
- Sign-in required? → **No** (feed works without auth)

**Contact Information**
- First Name: [Your first name]
- Last Name: [Your last name]
- Phone: [Your phone number]
- Email: [Your email]

**Notes** (optional, but helpful)
```
The main feature is an activity feed showing recent GitHub commits from featured open source repositories. No sign-in is required to view the feed. The optional GitHub sign-in is for accessing private repositories.
```

---

## Step 6: Build and Upload

### Option A: Using EAS Build (Recommended)

```bash
# Build for App Store
npx eas build --platform ios --profile production

# Wait for build to complete (10-20 minutes)
# EAS will show a URL to monitor progress

# Submit to App Store Connect
npx eas submit --platform ios
```

When prompted:
- Select the build you just created
- Confirm Apple ID credentials

### Option B: Using the Deploy Script

```bash
./scripts/deploy-testflight.sh
```

This builds and submits to TestFlight automatically.

---

## Step 7: Select Build in App Store Connect

1. After upload completes, wait 5-10 minutes for processing
2. In App Store Connect → Your App → iOS App
3. Scroll to **Build** section
4. Click **Select a build before you submit your app**
5. Choose the build you uploaded
6. If build is still processing, wait and refresh

---

## Step 8: App Privacy

### App Privacy Section

Click **Get Started** or **Edit** next to App Privacy

**Privacy Policy URL**
```
https://principal-ade.com/privacy
```

**Data Collection**
For Principal ADE, likely answers:
- Do you or your third-party partners collect data? → **Yes**

**Data Types Collected** (check what applies):
- [ ] Contact Info → No
- [ ] Health & Fitness → No
- [ ] Financial Info → No
- [ ] Location → No
- [ ] Sensitive Info → No
- [ ] Contacts → No
- [ ] User Content → No
- [x] Identifiers → Yes (GitHub user ID if signed in)
- [ ] Usage Data → No (unless you add analytics)
- [ ] Diagnostics → No (unless you add crash reporting)

For **Identifiers**:
- User ID → Used for **App Functionality**
- Linked to User → Yes
- Used for Tracking → No

---

## Step 9: Final Review

Before submitting, verify:
- [ ] All screenshots uploaded
- [ ] Description and keywords filled
- [ ] Age rating completed
- [ ] App privacy completed
- [ ] Build selected
- [ ] Contact info for review team

---

## Step 10: Submit for Review

1. Click **Add for Review** button (top right)
2. Review the summary
3. Click **Submit to App Review**

---

## After Submission

**Timeline**
- First review: Usually 24-48 hours
- May take longer during holidays or if issues found

**Possible Outcomes**
1. **Approved** → Goes live (or on your chosen release date)
2. **Rejected** → You'll get specific feedback in Resolution Center
3. **Metadata Rejected** → Only text/screenshots need fixing, no new build

**If Rejected**
1. Read feedback in Resolution Center
2. Fix issues
3. Reply in Resolution Center or submit new build
4. Resubmit for review

---

## Common Rejection Reasons to Avoid

1. **Broken links** - Test privacy policy and support URLs
2. **Incomplete features** - App must be fully functional
3. **Placeholder content** - No "lorem ipsum" or "coming soon"
4. **Crashes** - Test thoroughly before submitting
5. **Misleading metadata** - Screenshots must match actual app
6. **Login issues** - If login required, provide test account

---

## Monitoring Your App

After approval:
- **App Store Connect → App Analytics** - Downloads, sessions
- **App Store Connect → Crashes** - Basic crash reports
- **TestFlight** - For beta testing future versions

---

## Updating the App Later

1. Increment version in `app.json`:
   ```json
   "version": "1.0.1"
   ```
2. Build new version: `npx eas build --platform ios --profile production`
3. Submit: `npx eas submit --platform ios`
4. In App Store Connect, create new version
5. Add release notes ("What's New")
6. Submit for review
