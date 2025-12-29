# Xcode Project Setup Guide

**Task:** Create the iOS Xcode project to enable building and running AeroSense
**Estimated Time:** 15-30 minutes
**Prerequisites:** Xcode 15.0+, macOS 13+

---

## Step 1: Create New Xcode Project

1. **Open Xcode**

2. **File → New → Project**
   - Or: `Cmd + Shift + N`

3. **Choose Template:**
   - Select: **iOS → App**
   - Click: **Next**

4. **Project Options:**
   ```
   Product Name:        AeroSense
   Team:                [Select your Apple Developer team]
   Organization Identifier:  com.aerosense
   Bundle Identifier:    com.aerosense.app (auto-filled)
   Interface:           SwiftUI
   Language:             Swift
   Storage:             Core Data (☑️ CHECK THIS)
   Include Tests:        ☑️ CHECK THIS
   ```

5. **Save Location:**
   - Navigate to: `C:\aerosense\ios\`
   - **IMPORTANT:** Uncheck "Create Git repository" (already in git)
   - Click: **Create**

---

## Step 2: Configure Project Settings

### 2.1 General Settings

1. Select **AeroSense** project (top of navigator)
2. Select **AeroSense** target
3. **General tab:**

   ```
   Display Name:        AeroSense
   Bundle Identifier:    com.aerosense.app
   Version:              1.0
   Build:               1
   Deployment Target:   iOS 15.0
   ```

4. **App Icons and Launch Screens:**
   - Launch Screen: Set to use SwiftUI view from `ContentView.swift`

### 2.2 Build Settings

1. **Search Paths:**
   - **Header Search Paths:** Add `$(PROJECT_DIR)` (recursive)

2. **Swift Compiler - Language:**
   - **Swift Language Version:** Swift 5.9+

### 2.3 Signing & Capabilities

1. **Signing:**
   - **Automatically manage signing:** ☑️ CHECKED
   - **Team:** Select your development team

2. **Capabilities to Add:**
   - **Background Modes:** ☑️ Remote notifications
   - **Push Notifications:** (if available for your account)

---

## Step 3: Import Existing Swift Files

### 3.1 Delete Auto-Generated Files (Keep structure, replace content)

**KEEP these files (we'll replace content):**
- `AeroSenseApp.swift` (replace with existing)
- `ContentView.swift` (replace with existing)
- `Assets.xcassets` (keep, add app icon later)

**DELETE these auto-generated files:**
- `AeroSenseDataModel.xcdatamodeld` (use our pre-created one)

### 3.2 Add Existing Files to Project

1. **Right-click `AeroSense` folder in navigator**
2. **Select:** `Add Files to "AeroSense"...`
3. **Navigate to:** `C:\aerosense\ios\AeroSense\` (the existing folder)
4. **Import these folders:**
   ```
   ☑️ Models
   ☑️ Persistence
   ☑️ Services
   ☑️ ViewModels
   ☑️ Views
   ```

5. **IMPORTANT - Check these options:**
   - ☑️ **Copy items if needed** (if files aren't already in project)
   - ☑️ **Create groups** (NOT Create folder references)
   - ☑️ **Add to targets: AeroSense**

### 3.3 Replace App Files

**Replace `AeroSenseApp.swift`:**
1. Open existing `AeroSenseApp.swift` in Xcode
2. Delete all content
3. Copy content from `C:\aerosense\ios\AeroSense\AeroSenseApp.swift`
4. Paste and save

**Replace `ContentView.swift`:**
1. Open existing `ContentView.swift` in Xcode
2. Delete all content
3. Copy content from `C:\aerosense\ios\AeroSense\ContentView.swift`
4. Paste and save

---

## Step 4: Import Core Data Model

1. **Delete auto-generated model:**
   - Find `AeroSenseDataModel.xcdatamodeld` (auto-created)
   - Right-click → **Delete → Move to Trash**

2. **Add our pre-created model:**
   - Right-click `Persistence` folder
   - `Add Files to "AeroSense"...`
   - Navigate to: `C:\aerosense\ios\AeroSense\Persistence\`
   - Select: `AeroSenseDataModel.xcdatamodeld`
   - ☑️ **Copy items if needed**
   - ☑️ **Create groups**
   - ☑️ **Add to targets: AeroSense**

---

## Step 5: Replace Info.plist

1. **Select:** `AeroSense-Info.plist` in navigator (or Info.plist tab)
2. **File → Open as Plain Text** (or right-click → Open As → Plain Text)
3. **Delete all content**
4. **Copy content from:** `C:\aerosense\ios\AeroSense\Info.plist`
5. **Paste and save**
6. **File → Open as Property List** (return to normal view)

---

## Step 6: Verify Project Structure

After completing steps 1-5, your navigator should look like:

```
AeroSense/
├── AeroSenseApp.swift          ✅
├── Assets.xcassets             ✅
├── Preview Content/            ✅
├── Models/
│   └── FlightModels.swift      ✅
├── Persistence/
│   ├── CoreDataStack.swift     ✅
│   └── AeroSenseDataModel.xcdatamodeld/ ✅
├── Services/
│   └── APIServiceProtocol.swift ✅
├── ViewModels/
│   └── FlightListViewModel.swift ✅
└── Views/
    ├── FlightDetailView.swift  ✅
    ├── FlightListView.swift    ✅
    └── NotificationsView.swift ✅
```

---

## Step 7: Build and Run

### 7.1 Select Destination

1. **Click device simulator selector** (top toolbar)
2. **Choose:** iPhone 15 Pro (or any iOS 15+ simulator)

### 7.2 Build

1. **Product → Build** (or `Cmd + B`)
2. **Watch build log** for any errors

### 7.3 Resolve Expected Errors

**If you see missing module errors:**
- Product → Clean Build Folder (`Cmd + Shift + K`)
- Build again

**If you see Core Data errors:**
- Verify `AeroSenseDataModel.xcdatamodeld` is added to target
- Verify `CDNSPersistentCloudKitContainer` import

### 7.4 Run

1. **Product → Run** (or `Cmd + R`)
2. **Simulator should launch**
3. **You should see:** AeroSense app with tab bar

---

## Step 8: Verify Everything Works

**In the running simulator:**

1. ✅ App launches without crash
2. ✅ Tab bar is visible
3. ✅ Flights tab shows list placeholder
4. ✅ Notifications tab is accessible

**In Xcode debug console:**
1. ✅ No fatal errors
2. ✅ Core Data initialized
3. ✅ API client configured

---

## Troubleshooting

### "No such module 'AeroSenseModels'"

**Solution:** Add `Models` folder to target:
1. Select `Models` folder in navigator
2. **File Inspector** (right panel)
3. **Target Membership:** ☑️ **AeroSense**

### "Cannot find 'AeroSenseDataModel' in scope"

**Solution:**
1. Verify `.xcdatamodeld` file is added
2. Clean build folder (`Cmd + Shift + K`)
3. Rebuild

### "SwiftUI unavailable on iOS 14"

**Solution:** Set deployment target to iOS 15.0 in Build Settings

### "Signing for 'AeroSense' requires a development team"

**Solution:**
1. Project Settings → Signing & Capabilities
2. Select your Apple Developer team
3. Or: Uncheck "Automatically manage signing" and select manual provisioning

---

## Success Criteria

**Task 1 is COMPLETE when:**
- [ ] Xcode project builds without errors (`Cmd + B` succeeds)
- [ ] App runs in simulator (`Cmd + R` works)
- [ ] No fatal crashes on launch
- [ ] Tab bar and views are visible
- [ ] Console shows clean startup

---

## Next Step

Once Task 1 is complete, proceed to:
**Task 2: Deploy Backend Infrastructure to Staging**

Run: `cd infrastructure/scripts && ./deploy-infrastructure.sh staging`

---

*Guide created by: Dev Agent (James)*
*Date: December 29, 2025*
