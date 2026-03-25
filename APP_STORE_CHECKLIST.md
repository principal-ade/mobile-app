# App Store Submission Checklist

## App Functionality
- [x] Core activity feed working
- [x] Safe area handling (notch/home indicator)
- [x] Pull-to-refresh
- [x] Loading states
- [x] Error states
- [x] Empty states
- [ ] Test on physical iOS device
- [ ] Test on multiple screen sizes (iPhone SE, iPhone 16, iPhone 16 Pro Max)

## Code Quality
- [x] TypeScript compiles (`npx tsc --noEmit`)
- [x] ESLint passes (`npm run lint`)
- [ ] No console.log/debug statements in production code
- [ ] Remove unused code/dependencies

## App Configuration (`app.json`)
- [ ] App name finalized
- [ ] Bundle identifier set (e.g., `com.yourcompany.appname`)
- [ ] Version number set (1.0.0)
- [ ] Build number set (1)
- [ ] iOS deployment target configured

## Visual Assets
- [ ] App icon (1024x1024 PNG, no transparency, no rounded corners)
- [ ] Splash screen configured
- [ ] App icon variants generated for all sizes

## App Store Connect Setup
- [ ] Apple Developer Program enrolled ($99/year)
- [ ] App ID created in Apple Developer Portal
- [ ] App created in App Store Connect

## App Store Listing
- [ ] App name (30 characters max)
- [ ] Subtitle (30 characters max)
- [ ] Description (4000 characters max)
- [ ] Keywords (100 characters max, comma-separated)
- [ ] Category selected
- [ ] Screenshots:
  - [ ] 6.7" display (iPhone 16 Pro Max) - required
  - [ ] 6.5" display (iPhone 11 Pro Max)
  - [ ] 5.5" display (iPhone 8 Plus)
- [ ] App preview video (optional)
- [ ] Promotional text (optional)

## Privacy & Legal
- [ ] Privacy policy URL
- [ ] Privacy nutrition labels configured
- [ ] Terms of service URL (if applicable)
- [ ] Age rating questionnaire completed

## Build & Signing
- [ ] Distribution certificate created
- [ ] Provisioning profile created
- [ ] EAS Build configured OR local archive build working
- [ ] Test archive build locally

## TestFlight
- [ ] Upload build to TestFlight
- [ ] Internal testing group created
- [ ] Test app via TestFlight
- [ ] External beta testing (optional)
- [ ] Address any beta feedback

## Pre-Submission Review
- [ ] Review Apple's [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [ ] No placeholder content
- [ ] No broken links or images
- [ ] App doesn't crash on launch
- [ ] All features work as described
- [ ] No misleading metadata

## Submission
- [ ] Select build in App Store Connect
- [ ] Complete app information
- [ ] Submit for review
- [ ] Monitor for reviewer questions

---

## Notes

### Current Status
- Activity feed implemented with featured repos
- Home screen shows feed to all users (logged in or not)
- Uses `app.principal-ade.com` API for GitHub data

### Known Limitations
- Feed only shows commits from last 24 hours
- Featured repos are hardcoded

### Resources
- [Expo App Store Deployment Guide](https://docs.expo.dev/distribution/app-stores/)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
