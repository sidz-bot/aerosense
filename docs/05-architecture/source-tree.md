# AeroSense Source Tree

**Version:** 1.0
**Last Updated:** 2025-12-28
**Status:** Final

---

## Overview

This document defines the repository structure and file organization for the AeroSense project.

---

## Repository Structure

```
aerosense/
├── backend/                    # Backend API (Node.js/TypeScript)
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   │   └── index.ts
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API route handlers
│   │   │   └── flights.routes.ts
│   │   ├── services/          # Business logic services
│   │   │   ├── flight.service.ts
│   │   │   └── mock-data.service.ts
│   │   ├── types/            # TypeScript type definitions
│   │   │   └── flight.types.ts
│   │   ├── utils/            # Utility functions
│   │   └── index.ts          # Server entry point
│   ├── tests/                 # Test files
│   ├── package.json           # Dependencies
│   └── tsconfig.json         # TypeScript config
│
├── ios/                       # iOS Application (Swift/SwiftUI)
│   └── AeroSense/            # Main app folder
│       ├── AeroSenseApp.swift
│       ├── ContentView.swift
│       ├── APIClient.swift
│       └── DesignSystem.swift
│
├── docs/                      # Documentation
│   ├── 00-brief/             # Project brief
│   │   └── brief.md
│   ├── 01-requirements/      # Requirements
│   │   └── requirements.md
│   ├── 02-strategy/          # Product strategy
│   │   └── product_strategy.md
│   ├── 03-prd/               # PRD
│   │   └── PRD.md
│   ├── 04-ux/                # UX/Front-end spec
│   │   └── front-end-spec.md
│   ├── 05-architecture/       # Architecture
│   │   ├── architecture.md
│   │   ├── coding-standards.md
│   │   ├── tech-stack.md
│   │   └── source-tree.md
│   ├── 06-sprints/           # Sprint plans
│   │   └── sprint_plan.md
│   └── README.md              # Documentation index
│
├── .bmad-core/               # BMAD Framework
│   ├── agents/               # Agent configurations
│   ├── checklists/           # Quality checklists
│   ├── data/                 # Knowledge base
│   ├── tasks/                # Task definitions
│   ├── templates/            # Document templates
│   ├── utils/                # BMAD utilities
│   └── workflows/            # Workflow definitions
│
├── .claude/                  # Claude AI configuration
│   └── commands/             # Command definitions
│
├── .ai/                      # AI working directory
│   └── debug-log.md          # Debug logs
│
├── docs/stories/             # User stories (created during sprinting)
│
├── docs/qa/                  # QA test plans and reports
│
├── .gitignore                # Git ignore rules
├── README.md                 # Repository README
└── LICENSE                   # License file
```

---

## Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   └── index.ts                # Application configuration
│   │                                 # (port, JWT, Redis, database URLs)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT authentication
│   │   ├── rate-limit.middleware.ts  # Rate limiting
│   │   └── error-handler.middleware.ts # Global error handling
│   │
│   ├── routes/
│   │   ├── index.ts                 # Route aggregation
│   │   ├── flights.routes.ts        # Flight endpoints
│   │   ├── auth.routes.ts           # Authentication endpoints
│   │   ├── users.routes.ts           # User endpoints
│   │   └── notifications.routes.ts  # Notification endpoints
│   │
│   ├── services/
│   │   ├── flight.service.ts        # Flight business logic
│   │   ├── user.service.ts          # User management
│   │   ├── notification.service.ts  # Notification logic
│   │   ├── cache.service.ts         # Redis caching wrapper
│   │   └── mock-data.service.ts     # Mock data for development
│   │
│   ├── types/
│   │   ├── flight.types.ts          # Flight-related types
│   │   ├── user.types.ts            # User-related types
│   │   ├── notification.types.ts   # Notification types
│   │   └── api.types.ts             # API request/response types
│   │
│   ├── utils/
│   │   ├── logger.ts                # Logging utility
│   │   ├── validator.ts             # Input validation helpers
│   │   └── errors.ts                # Custom error classes
│   │
│   └── index.ts                     # Application entry point
│
├── tests/
│   ├── unit/                         # Unit tests
│   │   ├── services/                # Service tests
│   │   └── utils/                   # Utility tests
│   ├── integration/                  # Integration tests
│   │   └── routes/                  # Route tests
│   └── e2e/                          # End-to-end tests
│
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── jest.config.js                    # Jest configuration
├── .eslintrc.json                    # ESLint rules
└── .prettierrc                       # Prettier configuration
```

---

## iOS Structure

```
ios/AeroSense/
├── App/                             # Main application
│   ├── AeroSenseApp.swift          # App entry point
│   └── AppDelegate.swift           # App delegate (if needed)
│
├── Views/                           # SwiftUI Views
│   ├── FlightListView.swift        # Flight list screen
│   ├── FlightDetailView.swift      # Flight detail screen
│   ├── NotificationListView.swift  # Notifications screen
│   ├── SettingsView.swift          # Settings screen
│   └── Components/                 # Reusable UI components
│       ├── FlightCard.swift
│       ├── StatusIndicator.swift
│       └── ConnectionRiskCard.swift
│
├── ViewModels/                      # MVVM ViewModels
│   ├── FlightListViewModel.swift
│   ├── FlightDetailViewModel.swift
│   └── NotificationViewModel.swift
│
├── Services/                        # Business logic services
│   ├── APIClient.swift             # Network layer
│   ├── FlightService.swift          # Flight API wrapper
│   ├── CacheService.swift          # Core Data wrapper
│   └── NotificationManager.swift   # Push notification handler
│
├── Models/                          # Data models
│   ├── Flight.swift
│   ├── User.swift
│   └── Connection.swift
│
├── Utils/                           # Utility functions
│   ├── Extensions/
│   │   ├── String+Extensions.swift
│   │   └── Date+Extensions.swift
│   └── Constants.swift
│
├── Resources/                       # Assets
│   ├── Assets.xcassets             # Images, colors
│   ├── Info.plist                  # App configuration
│   └── Localizable.strings          # Localization strings
│
└── AeroSense.xcodeproj/            # Xcode project file
```

---

## File Naming Conventions

### Backend (TypeScript)

| Type | Convention | Example |
|------|-------------|---------|
| Files | `camelCase.ts` | `flightService.ts` |
| Interfaces | `PascalCase` | `IFlightRepository` (optional I prefix) |
| Types | `PascalCase` | `Flight`, `User` |
| Enums | `PascalCase` | `FlightStatus` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FLIGHTS` |
| Test files | `*.test.ts` | `flightService.test.ts` |

### iOS (Swift)

| Type | Convention | Example |
|------|-------------|---------|
| Files | `PascalCase.swift` | `FlightListView.swift` |
| Protocols | `PascalCase` | `FlightServiceProtocol` |
| Structs | `PascalCase` | `Flight`, `ConnectionRisk` |
| Classes | `PascalCase` | `FlightListViewModel` |
| Extensions | `PascalCase+Type.swift` | `String+Extensions.swift` |
| XIBs/Storyboards | `PascalCase.xib` | (Not used - SwiftUI) |

---

## Import Path Conventions

### Backend (TypeScript)

```typescript
// ✅ Good: Absolute path aliases
import { FlightService } from '@services/flight.service';
import { Flight } from '@types/flight.types';

// ❌ Bad: Relative paths
import { FlightService } from '../../services/flight.service';
```

### iOS (Swift)

```swift
// ✅ Good: Grouped, sorted imports
import SwiftUI
import Combine

// Local imports
import struct AeroSenseModels

// ❌ Bad: Wildcard imports
import *
```

---

## Documentation Structure

### File Organization

| Folder | Purpose | Update Frequency |
|--------|---------|------------------|
| `00-brief/` | Project vision/brief | Rarely |
| `01-requirements/` | Product requirements | Per sprint |
| `02-strategy/` | Product strategy, roadmap | Per quarter |
| `03-prd/` | Product requirements doc | Per sprint |
| `04-ux/` | UX/UI specifications | Per sprint |
| `05-architecture/` | Technical architecture | Per phase |
| `06-sprints/` | Sprint plans | Per sprint |

### Document Versioning

All documents should include:
```markdown
**Version:** X.Y
**Last Updated:** YYYY-MM-DD
**Status:** Draft | Final
**Author:** Agent Name
```

---

## Configuration Files

### Backend

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript compiler options |
| `.eslintrc.json` | Linting rules |
| `.prettierrc` | Code formatting |
| `jest.config.js` | Test configuration |
| `.env.example` | Environment variable template |

### iOS

| File | Purpose |
|------|---------|
| `Info.plist` | App configuration |
| `Package.swift` | Swift Package Manager |
| `.xcodeproj/` | Project settings |

---

## .gitignore Patterns

### Backend
```
node_modules/
dist/
build/
*.log
.env
.DS_Store
coverage/
```

### iOS
```
DerivedData/
build/
*.pbxuser
*.perspectivev3
Pods/
xcuserdata/
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-28 | Initial source tree definition |
