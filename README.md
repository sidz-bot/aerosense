# AeroSense

**Aviation Intelligence for Passengers**

[![iOS](https://img.shields.io/badge/iOS-15%2B+-blue.svg)](https://www.apple.com/ios/)
[![Swift](https://img.shields.io/badge/Swift-5.9%2B+-orange.svg)](https://swift.org)
[![SwiftUI](https://img.shields.io/badge/SwiftUI-4.0%2B+-purple.svg)](https://developer.apple.com/xcode/swiftui/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

---

## Overview

**AeroSense** is an aviation intelligence iOS application designed to help passengers never miss a gate change and never worry about connections. The app provides real-time flight tracking, instant gate change alerts, and predictive connection risk analysis.

### Core Value Proposition

> **"Never miss a gate change. Never worry about connections."**

### Primary Differentiator

**Connection Risk Analysis** - A predictive engine that analyzes your connection and tells you whether you'll make it, based on real-time flight data, historical delays, and gate distances.

---

## 🚀 Quick Start

### Prerequisites

- **iOS:** 15.0+ (99%+ device coverage)
- **Node.js:** 20 LTS
- **PostgreSQL:** 15+
- **Redis:** 7+

### Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev    # Server runs on http://localhost:3000
npm run test    # Run tests
```

**API Documentation:**
```
http://localhost:3000/docs
```

---

## 📊 Current Development Status

| Milestone | Sprint | Status | Target Date |
|-----------|--------|--------|-------------|
| **Foundation Complete** | Sprint 3 | 🚧 In Progress | Week 6 |
| **Core Tracking Complete** | Sprint 5 | 📋 Planned | Week 10 |
| **Notification System Complete** | Sprint 7 | 📋 Planned | Week 14 |
| **Beta Launch** | Sprint 10 | 📋 Planned | Week 20 |
| **App Store Launch** | Sprint 12 | 📋 Planned | Week 24 |

### Sprint 1 Status (Current)

**Focus:** Infrastructure & Foundation

| Task | Status |
|------|--------|
| AWS infrastructure setup | ✅ Complete |
| iOS app project (SwiftUI) | ✅ Complete |
| Backend API skeleton | ✅ Complete |
| Flight search endpoint (mock) | ✅ Complete |
| User authentication | 📋 Planned |
| Database setup | 📋 Planned |

---

## 🏗️ Repository Structure

```
aerosense/
├── backend/           # Backend API (Node.js/TypeScript)
├── ios/               # iOS Application (Swift/SwiftUI)
├── docs/              # Project Documentation
│   ├── 00-brief/     # Project brief
│   ├── 01-requirements/
│   ├── 02-strategy/
│   ├── 03-prd/
│   ├── 04-ux/
│   ├── 05-architecture/
│   └── 06-sprints/
├── .bmad-core/        # BMAD Framework (agentic workflows)
└── README.md          # This file
```

**For complete architecture details, see [docs/05-architecture/](docs/05-architecture/)**

---

## 🛠 Technology Stack

### Frontend (iOS)

| Component | Technology |
|-----------|-----------|
| Language | Swift 5.9+ |
| UI Framework | SwiftUI (iOS 15+) |
| Pattern | MVVM + Combine |
| Networking | URLSession |
| Local Storage | Core Data |
| Push Notifications | APNs |

### Backend

| Component | Technology |
|-----------|-----------|
| Language | TypeScript 5.3+ |
| Runtime | Node.js 20 LTS |
| Framework | Fastify 4.x |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Queue | AWS SQS |
| Infrastructure | AWS (ECS, RDS, ElastiCache) |

**For complete technology stack details, see [docs/05-architecture/tech-stack.md](docs/05-architecture/tech-stack.md)**

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Project Brief](docs/00-brief/brief.md) | Executive summary and vision |
| [Requirements](docs/01-requirements/requirements.md) | Functional and non-functional requirements |
| [Product Strategy](docs/02-strategy/product_strategy.md) | MVP scope, roadmap, monetization |
| [PRD](docs/03-prd/PRD.md) | Complete product requirements document |
| [Front-End Spec](docs/04-ux/front-end-spec.md) | UI/UX specification and design system |
| [Architecture](docs/05-architecture/architecture.md) | System architecture and technical design |
| [Sprint Plan](docs/06-sprints/sprint_plan.md) | Sprint breakdown and user stories |

**See [docs/README.md](docs/README.md) for complete documentation index.**

---

## 🎯 Key Features

### MVP Features (Sprints 1-8)

1. **Flight Tracking**
   - Add flights by number or route
   - Real-time status updates (30-second refresh)
   - Multi-segment itinerary support
   - Offline flight data display

2. **Gate Change Alerts** ⭐
   - Push notifications within 60 seconds of gate change
   - Full-screen in-app alert with walking time
   - "Get Directions" integration with Apple Maps

3. **Delay Alerts**
   - Notifications for delays > 15 minutes
   - In-app banner alerts
   - Updated departure time display

4. **Connection Risk Intelligence** ⭐
   - Real-time risk assessment (On Track / At Risk / Critical)
   - Risk factors explanation
   - Alternative flights display
   - Rebooking guidance

### Future Features (Phase 2+)

- Android application
- Predictive delays (ML-based)
- Airport maps integration
- Calendar integration
- Real-time flight positions (WebSocket)

---

## 🧩 Development Roadmap

### Phase 1: MVP (Months 1-6)

- **Platform:** iOS only
- **API Provider:** FlightAware Basic ($5,000/month)
- **Target:** 1,000 active users
- **Key Metric:** < 60s gate change notification latency

### Phase 2: Growth (Months 7-12)

- **Platform:** iOS + Android (React Native)
- **Monetization:** Premium subscription ($4.99/month)
- **Target:** 10,000 active users
- **Key Metric:** $0.50/user/month cost

### Phase 3: Scale (Months 13-18)

- **Architecture:** Microservices
- **Infrastructure:** Multi-region
- **Target:** 100,000 active users
- **Key Metric:** Profitable at scale

---

## 🤝 Contributing

This is a proprietary product. Contributions are by invitation only.

### Development Standards

- **Code:** See [docs/05-architecture/coding-standards.md](docs/05-architecture/coding-standards.md)
- **Commit:** Conventional commits format
- **Review:** All code requires peer review

### Getting Started

1. Read the [Architecture Overview](docs/05-architecture/architecture.md)
2. Review the [Sprint Plan](docs/06-sprints/sprint_plan.md)
3. Check [Coding Standards](docs/05-architecture/coding-standards.md)

---

## 📄 License

Proprietary - All rights reserved. Copyright © 2025 AeroSense.

---

## 🔗 Links

- **Product:** [aerosense.app](https://aerosense.app) (coming soon)
- **Documentation:** [docs/README.md](docs/README.md)
- **Sprint Tracking:** See [Sprint Plan](docs/06-sprints/sprint_plan.md)

---

**Last Updated:** 2025-12-28
**Version:** 1.0.0
**Status:** In Development 🚧
