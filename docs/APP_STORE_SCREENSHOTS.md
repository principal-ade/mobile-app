# App Store Screenshots Guide

## Required Devices

| Device | Size | Dimensions | Simulator Name |
|--------|------|------------|----------------|
| iPhone 16 Pro Max | 6.7" | 1320 x 2868 | `iPhone 16 Pro Max` |
| iPad Pro 13" | 12.9" | 2048 x 2732 | `iPad Pro 13-inch (M4)` |

## Step 1: Install Simulators

Open Xcode and install the required simulators:

```bash
open -a Xcode
```

Then: **Xcode → Settings → Platforms → iOS → Download simulators if needed**

Verify available simulators:

```bash
xcrun simctl list devices available | grep -E "iPhone 16 Pro Max|iPad Pro"
```

## Step 2: Boot the iPhone Simulator

```bash
# Start iPhone 16 Pro Max simulator
xcrun simctl boot "iPhone 16 Pro Max"

# Open Simulator app
open -a Simulator
```

## Step 3: Run the App via Expo

In a separate terminal:

```bash
npm run start
```

Then press **i** to open in iOS simulator.

If it opens on the wrong device, in Simulator app: **File → Open Simulator → iPhone 16 Pro Max**, then press **i** again.

## Step 4: Capture iPhone Screenshots

With the simulator open and app running:

**Option A: Keyboard shortcut**
- **Cmd + S** in Simulator - Saves screenshot to Desktop

**Option B: Command line**
```bash
xcrun simctl io booted screenshot ~/Desktop/screenshot.png
```

### Screenshots to Capture (iPhone)

1. **Feed Main View** - Show activity feed with commits visible
2. **Feed Scrolled** - Show File City visualization
3. **About Screen** - Tap About tab, capture branding

```bash
# Navigate to each screen in the app, then run the corresponding command:

# Screenshot 1: Feed main view
xcrun simctl io booted screenshot ~/Desktop/01-feed-main.png

# Screenshot 2: Scroll down to File City, then:
xcrun simctl io booted screenshot ~/Desktop/02-feed-filecity.png

# Screenshot 3: Tap About tab, then:
xcrun simctl io booted screenshot ~/Desktop/03-about.png
```

## Step 5: Switch to iPad

1. In Simulator: **File → Open Simulator → iPad Pro 13-inch (M4)**
2. Back in your terminal running Expo, press **Shift + i**
3. Select the iPad from the list

Or manually in the iPad simulator, shake to open dev menu and reload.

## Step 6: Capture iPad Screenshots

```bash
# Same process - navigate to each screen, then capture:
xcrun simctl io booted screenshot ~/Desktop/ipad-01-feed-main.png
xcrun simctl io booted screenshot ~/Desktop/ipad-02-feed-filecity.png
xcrun simctl io booted screenshot ~/Desktop/ipad-03-about.png
```

## Step 8: Shutdown Simulators

```bash
xcrun simctl shutdown all
```

## Screenshot Checklist

### iPhone (6.7")
- [ ] Activity Feed - top of feed with recent commits
- [ ] Activity Feed - scrolled to show File City visualization
- [ ] About Screen

### iPad (12.9")
- [ ] Activity Feed - top of feed
- [ ] Activity Feed - scrolled to show File City
- [ ] About Screen

## Tips

- **Clean status bar**: Screenshots auto-capture with time 9:41 (Apple standard)
- **Good content**: Make sure feed has interesting commits visible
- **Light/Dark mode**: Consider capturing both if supported
- **No personal data**: Ensure no sensitive info visible

## Upload Location

Screenshots go in **App Store Connect**:

1. Go to https://appstoreconnect.apple.com
2. Select your app
3. Go to **App Store** tab → **Screenshots**
4. Drag and drop screenshots to each device size

## Optional: Add Marketing Frames

Tools to add text/frames around screenshots:
- [Fastlane Frameit](https://docs.fastlane.tools/actions/frameit/) (free, CLI)
- [Screenshots.pro](https://screenshots.pro) (paid, web)
- [Figma](https://figma.com) (free, manual)

Simple Figma approach:
1. Create frame at exact dimensions (1320x2868 for 6.7")
2. Place screenshot
3. Add headline text above
4. Export as PNG
