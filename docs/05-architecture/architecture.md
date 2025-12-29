# AeroSense System Architecture

**Version:** 1.0
**Author:** Winston (Architect)
**Date:** 2025-12-28
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [High-Level System Architecture](#high-level-system-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Flight Data Ingestion Strategy](#flight-data-ingestion-strategy)
6. [Notification & Alert Architecture](#notification--alert-architecture)
7. [Scalability, Reliability & Security](#scalability-reliability--security)
8. [Technology Stack](#technology-stack)
9. [Deployment Architecture](#deployment-architecture)
10. [Cost Optimization Strategy](#cost-optimization-strategy)
11. [Migration Path](#migration-path)

---

## Executive Summary

AeroSense is a **client-server mobile application** built on iOS for MVP, with Android planned for Phase 2. The architecture is designed around three core principles:

1. **API Cost Optimization** - Aggressive caching and intelligent data minimization to manage $5,000/month aviation API costs
2. **Real-Time Responsiveness** - Sub-60 second notification latency for gate changes and delays
3. **Scalability Foundation** - Architecture supports growth from 1K to 100K concurrent users

**Architecture Pattern:** Layered architecture with microservices-ready backend
**Primary Differentiator:** Connection Risk Analysis engine predicting connection success
**Critical Constraint:** Aviation API costs dictate aggressive 60-second caching strategy

---

## High-Level System Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AEROSENSE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐         ┌─────────────────────────────────────────────┐  │
│  │   iOS App    │         │              Backend Services                │  │
│  │  (SwiftUI)   │◄────────┤                                             │  │
│  │              │  HTTPS  │  ┌──────────┐  ┌──────────┐  ┌───────────┐ │  │
│  │ - Flight UI  │         │  │   API    │  │  Flight  │  │ Notification│ │  │
│  │ - Connection │         │  │ Gateway  │  │ Ingestion│  │  Service   │ │  │
│  │   Analysis   │         │  │          │  │          │  │            │ │  │
│  │ - Alerts     │         │  └────┬─────┘  └────┬─────┘  └─────┬───────┘ │  │
│  └──────────────┘         │       │            │              │         │  │
│                           │       │            │              │         │  │
│  ┌──────────────┐         │  ┌────▼─────┐  ┌──▼──────┐  ┌───▼──────┐   │  │
│  │ APNS Push    │◄────────┤  │ Auth     │  │ Cache   │  │ Queue    │   │  │
│  │ Notification │         │  │ Service  │  │ Layer   │  │ (SQS)    │   │  │
│  └──────────────┘         │  └──────────┘  └─────────┘  └──────────┘   │  │
│                           │                                             │  │
│                           └─────────────────────────────────────────────┘  │
│                                             │                              │
│                                   ┌─────────▼─────────┐                    │
│                                   │  Data Persistence │                    │
│                                   │  - PostgreSQL     │                    │
│                                   │  - Redis Cache    │                    │
│                                   └───────────────────┘                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                              EXTERNAL INTEGRATIONS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ FlightAware  │  │  APNS        │  │  Twilio      │  │  Stripe      │  │
│  │   API        │  │  (Apple)     │  │  (SMS)       │  │ (Payments)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Layers

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **Presentation** | iOS SwiftUI App | User interface, state management, local caching |
| **Application** | API Gateway | Request routing, authentication, rate limiting |
| **Domain** | Flight Services | Business logic, connection risk analysis |
| **Data** | PostgreSQL + Redis | Persistent storage, high-performance caching |
| **Infrastructure** | AWS Cloud | Compute, storage, messaging, monitoring |

---

## Frontend Architecture

### Platform Decision: iOS Native Mobile App

**Rationale for Native iOS App (vs PWA):**

| Factor | iOS Native | PWA | Decision |
|--------|------------|-----|----------|
| Push Notification Latency | < 30s (APNS) | 2-5s (Web Push) + polling overhead | **Native wins** - Critical for gate changes |
| Offline Flight Tracking | Full local database | Limited (Service Worker cache) | **Native wins** - Core use case |
| Background Location | CoreLocation (always-on) | Geolocation API (restricted) | **Native wins** - Airport arrival detection |
| App Store Discoverability | High (Travel category) | Low (SEO-dependent) | **Native wins** - User acquisition |
| Development Cost | Higher | Lower | PWA wins - but not critical for MVP |
| Time to Market | 6 months | 4 months | PPA wins - acceptable trade-off |

**Final Decision:** **iOS Native App** - The push notification latency, offline capabilities, and app store presence are non-negotiable for the core value proposition.

### UI Framework Decision: SwiftUI

**Recommendation: SwiftUI** (iOS 15+ target)

**Rationale:**
- Modern declarative UI framework aligned with Apple's direction
- Native async/await support (iOS 15+) for clean API calls
- Built-in state management (@State, @Published, @EnvironmentObject)
- Preview canvas accelerates development
- Future-proof - UIKit is in maintenance mode

**Fallback Strategy:** Use UIKit for complex custom views if needed (SwiftUI/UIKit interoperability is seamless)

### Frontend Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IOS APP ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      SwiftUI Views                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │FlightList│  │LiveTrack │  │GateAlert │  │Settings  │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   ViewModels (MVVM)                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │FlightListVM  │  │LiveTrackingVM│  │AlertManagerVM│      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Services Layer                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │APIClient     │  │FlightService │  │CacheService  │      │   │
│  │  │(URLSession)  │  │              │  │(Core Data)   │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Data Layer                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │HTTP Requests │  │Local SQLite  │  │User Defaults │      │   │
│  │  │              │  │(Core Data)   │  │              │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Frontend Components

#### 1. APIClient (Network Layer)
```swift
// Single responsibility: HTTP communication with backend APIs
// Implements retry logic, authentication injection, request throttling

class APIClient {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
    func authRequest<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}
```

#### 2. FlightService (Business Logic)
```swift
// Orchestrates API calls and local data management
// Implements 60-second cache-aware fetch strategy

class FlightService {
    func getTrackedFlights() async throws -> [Flight]
    func searchFlights(query: FlightSearchQuery) async throws -> [FlightSearchResult]
    func trackFlight(flightId: String) async throws -> Flight
    func getConnectionRisk(flightId: String) async throws -> ConnectionRisk
}
```

#### 3. CacheService (Local Persistence)
```swift
// Three-tier caching strategy:
// 1. Memory cache (instant access, app session only)
// 2. Core Data (persistent, fast reads)
// 3. Remote cache (Redis, shared across users)

class CacheService {
    func get<T: Codable>(_ key: String) -> T?
    func set<T: Codable>(_ key: String, value: T, ttl: TimeInterval)
    func invalidate(_ key: String)
}
```

#### 4. NotificationManager (Push Notifications)
```swift
// Manages APNS registration and push notification handling
// Implements local notification scheduling for critical alerts

class NotificationManager {
    func registerForPushNotifications() async throws
    func handlePushNotification(userInfo: [AnyHashable: Any])
    func scheduleLocalNotification(content: UNMutableNotificationContent)
}
```

### State Management Strategy

**Pattern:** MVVM with Combine framework

```swift
// ViewModels expose @Published properties that Views observe
// ViewModels call Services to fetch/transform data
// Views are pure SwiftUI - no business logic

class FlightListViewModel: ObservableObject {
    @Published var flights: [Flight] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let flightService: FlightService
    private var cancellables = Set<AnyCancellable>()

    func loadTrackedFlights() {
        // Fetch from service, update published properties
    }
}
```

### Offline Strategy

| Data Type | Offline Availability | Sync Strategy |
|-----------|---------------------|---------------|
| Tracked Flights | Full (Core Data) | Background sync when network available |
| Flight History | Last 30 days | Sync on app launch |
| User Preferences | Full (UserDefaults) | Instant sync to backend |
| Connection Risk | Cached with 60s expiry | Refresh on app open |

---

## Backend Architecture

### Architecture Style: Layered Services with Microservices-Ready Design

**Rationale:**
- **MVP (Phase 1):** Monolithic backend for simplicity and speed
- **Growth (Phase 2):** Extract Flight Ingestion into separate service
- **Scale (Phase 3):** Full microservices with dedicated Notification Service

### Backend Service Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVICES LAYER                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        API Gateway                               │   │
│  │  - Request routing (Express.js / Fastify)                        │   │
│  │  - Authentication middleware (JWT validation)                    │   │
│  │  - Rate limiting (user-based, IP-based)                          │   │
│  │  - Request logging (structured JSON)                             │   │
│  │  - API versioning (/v1/* endpoints)                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                │                                         │
│          ┌─────────────────────┼─────────────────────┐                  │
│          ▼                     ▼                     ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Flight     │    │   User       │    │ Notification │              │
│  │   Service    │    │   Service    │    │   Service    │              │
│  │              │    │              │    │              │              │
│  │ - Search     │    │ - Auth       │    │ - APNS       │              │
│  │ - Tracking   │    │ - Profile    │    │ - Queuing    │              │
│  │ - Updates    │    │ - Settings   │    │ - Templates  │              │
│  │ - Connection │    │ - Billing    │    │ - Preferences│              │
│  │   Risk       │    │              │    │              │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                      │
│         └───────────────────┼───────────────────┘                      │
│                             ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Data Access Layer                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ PostgreSQL   │  │ Redis        │  │ S3           │          │   │
│  │  │ ORM (Prisma) │  │ Cache Client │  │ Storage      │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Backend Services

#### 1. Flight Service
**Responsibility:** All flight data operations and connection risk analysis

```javascript
// Key endpoints
GET    /api/v1/flights/search              // Search flights by number/route
POST   /api/v1/flights/{id}/track          // User tracks a flight
GET    /api/v1/flights/tracked             // Get user's tracked flights
GET    /api/v1/flights/{id}/live           // Real-time flight status
GET    /api/v1/flights/{id}/connections    // Connection analysis
POST   /api/v1/flights/{id}/alerts         // Configure alert preferences
```

**Connection Risk Analysis Logic:**
```javascript
// Connection Risk Calculation
function calculateConnectionRisk(incomingFlight, outgoingFlight) {
    const scheduledConnectionTime = outgoingFlight.departureTime - incomingFlight.arrivalTime;
    const historicalDelay = getHistoricalDelay(incomingFlight.flightNumber);
    const currentDelay = incomingFlight.delayMinutes || 0;
    const airportChangeTime = getAirportChangeTime(incomingFlight.gate, outgoingFlight.gate);
    const riskFactors = {
        scheduledConnectionTime: scheduledConnectionTime < 45 ? 'HIGH' : scheduledConnectionTime < 60 ? 'MEDIUM' : 'LOW',
        currentDelay: currentDelay,
        bufferRemaining: scheduledConnectionTime - currentDelay - airportChangeTime,
        historicalProbability: getHistoricalOnTimeProbability(incomingFlight.flightNumber)
    };

    return riskScore(riskFactors); // Returns: LOW_RISK, MEDIUM_RISK, HIGH_RISK, CRITICAL
}
```

#### 2. User Service
**Responsibility:** Authentication, user profile, preferences, billing

```javascript
// Key endpoints
POST   /api/v1/auth/register              // User registration
POST   /api/v1/auth/login                 // User login (returns JWT)
POST   /api/v1/auth/refresh               // Refresh JWT token
POST   /api/v1/auth/logout                // Invalidate token
GET    /api/v1/users/me                   // Get user profile
PATCH  /api/v1/users/me                   // Update profile
GET    /api/v1/users/me/settings          // Get notification preferences
PATCH  /api/v1/users/me/settings          // Update preferences
GET    /api/v1/users/me/subscription      // Get subscription status
POST   /api/v1/users/me/subscription      // Create/update subscription
```

#### 3. Notification Service
**Responsibility:** Push notification management, alert delivery

```javascript
// Key endpoints
POST   /api/v1/notifications/register     // Register APNS device token
DELETE /api/v1/notifications/register     // Unregister device
GET    /api/v1/notifications/history      // Get notification history
PATCH  /api/v1/notifications/preferences  // Update alert preferences
```

**Alert Types Implemented:**
- `GATE_CHANGE` - Gate or terminal change
- `DELAY_ALERT` - Departure/arrival delay > 15 minutes
- `CONNECTION_RISK` - Connection risk changes (e.g., LOW → MEDIUM)
- `FLIGHT_CANCELED` - Flight cancellation
- `BOARDING_STARTED` - Boarding has begun
- `APPROACHING_GATE` - User proximity to gate (optional, opt-in)

### API Design Principles

**RESTful Conventions:**
- Standard HTTP verbs (GET, POST, PATCH, DELETE)
- Resource-based URLs (`/flights/{id}`, `/users/me`)
- JSON request/response bodies
- HTTP status codes for errors
- Pagination for list endpoints (`?page=1&limit=20`)

**Authentication:**
- JWT-based stateless authentication
- Access token: 15-minute expiry
- Refresh token: 30-day expiry (stored securely in Keychain)
- Token rotation on refresh

**Rate Limiting:**
```
Free tier:
- 100 API requests/hour
- 5 tracked flights maximum
- 60-second cache hit ratio > 80%

Premium tier:
- 1,000 API requests/hour
- Unlimited tracked flights
- 30-second cache (reduced latency)
```

**Error Response Format:**
```json
{
    "error": {
        "code": "FLIGHT_NOT_FOUND",
        "message": "Flight AA123 on 2025-12-28 not found",
        "details": {
            "flightNumber": "AA123",
            "date": "2025-12-28"
        }
    }
}
```

---

## Flight Data Ingestion Strategy

### The Critical Challenge

**FlightAware API Cost Structure:**
- Basic Plan: $5,000/month for 5,000 API calls/day
- Each tracked flight refresh = 1 API call
- 10K users tracking 5 flights = 50K potential API calls/day = **$50,000/month**

**Solution: Aggressive Multi-Layer Caching**

### Ingestion Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     FLIGHT DATA INGESTION PIPELINE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  EXTERNAL API                     BACKEND                    CLIENT     │
│                                                                         │
│  ┌─────────────┐                 ┌─────────────┐              ┌──────────┐
│  │FlightAware  │                 │   Redis     │              │  iOS App │
│  │    API      │                 │   Cache     │              │          │
│  └──────┬──────┘                 └──────┬──────┘              └────┬─────┘
│         │                               │                           │      │
│         │  1. Poll every               │  2. Serve from           │      │
│         │     60 seconds               │     cache (80%+ hit)     │      │
│         │                               │                           │      │
│         ▼                               ▼                           ▼      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Ingestion Service (Node.js)                      │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │            Active Flight Tracking Table                      │  │ │
│  │  │  - Flight ID, last_fetch_time, subscriber_count            │  │ │
│  │  │  - Priority queue: flights with >100 subscribers first     │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │              Ingestion Scheduler (Cron)                      │  │ │
│  │  │  - Fetch from FlightAware every 60 seconds                  │  │ │
│  │  │  - Update Redis cache                                        │  │ │
│  │  │  - Push changes to Notification Queue (SQS)                 │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │              Change Detection Engine                         │  │ │
│  │  │  - Compare previous/current state                            │  │ │
│  │  │  - Detect: gate changes, delays >15min, cancellations       │  │ │
│  │  │  - Trigger notification workflow for significant changes    │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Caching Strategy

#### Three-Layer Cache Architecture

| Layer | Technology | TTL | Hit Rate Target | Purpose |
|-------|-----------|-----|-----------------|---------|
| **L1: Client** | Core Data (iOS) | 60s | 20% | Instant UI load, offline support |
| **L2: Server** | Redis (ElastiCache) | 60s | 60% | Shared cache, reduce API calls |
| **L3: CDN** (optional) | CloudFront | 120s | 10% | Geographic distribution |

**Cache Key Format:**
```
flight:{flightId}:{date}
flights:user:{userId}:tracked
connections:{incomingFlightId}:{outgoingFlightId}
```

**Cache Invalidation Strategy:**
- Time-based: TTL expiration (60 seconds)
- Event-based: Immediate invalidation on gate change/delay
- Priority-based: High-traffic flights refreshed more frequently

### Ingestion Optimization

#### 1. Smart Polling

```javascript
// Prioritize flights by subscriber count
async function prioritizeFlightPolls() {
    const activeFlights = await getActiveTrackedFlights();
    const prioritized = activeFlights.sort((a, b) => {
        // Priority: subscriber count, then time since last fetch
        const aScore = a.subscriberCount * 1000 + (Date.now() - a.lastFetch);
        const bScore = b.subscriberCount * 1000 + (Date.now() - b.lastFetch);
        return bScore - aScore;
    });

    // Fetch top 5000 flights (within API limit)
    const topFlights = prioritized.slice(0, 5000);

    for (const flight of topFlights) {
        await fetchAndCacheFlight(flight.id);
    }
}
```

#### 2. Batch API Calls

```javascript
// FlightAware supports batch requests (up to 50 flights per call)
async function batchFetchFlights(flightIds: string[]) {
    const batches = chunk(flightIds, 50);
    for (const batch of batches) {
        const response = await flightAwareAPI.bulkFetch(batch);
        await updateRedisCache(response.flights);
        await detectAndNotifyChanges(response.flights);
    }
}
```

#### 3. Data Deduplication

```javascript
// Store last-known state to avoid duplicate processing
async function processFlightUpdate(flightData) {
    const lastState = await redis.get(`flight:${flightData.id}:last_state`);

    if (hasSignificantChanges(lastState, flightData)) {
        await updateCache(flightData);
        await triggerNotifications(flightData, lastState);
        await redis.set(`flight:${flightData.id}:last_state`, JSON.stringify(flightData));
    }
}
```

### Connection Risk Data Ingestion

**Challenge:** Connection risk requires both incoming + outgoing flight data

**Solution:**
1. Fetch incoming flight data (already cached)
2. Fetch outgoing flight data (may require API call if not cached)
3. Calculate connection risk algorithmically (no additional API cost)

**Connection Risk Calculation:**
```javascript
function calculateConnectionRisk(incoming, outgoing) {
    const scheduledConnection = outgoing.scheduledDeparture - incoming.scheduledArrival;
    const estimatedArrival = incoming.scheduledArrival + (incoming.delay || 0);
    const buffer = outgoing.scheduledDeparture - estimatedArrival;
    const gateChangeTime = calculateGateChangeTime(incoming.gate, outgoing.gate);

    const effectiveBuffer = buffer - gateChangeTime;

    if (effectiveBuffer < 20) return 'CRITICAL'; // < 20 min buffer
    if (effectiveBuffer < 30) return 'HIGH';     // 20-30 min buffer
    if (effectiveBuffer < 45) return 'MEDIUM';   // 30-45 min buffer
    return 'LOW';                                // > 45 min buffer
}
```

---

## Notification & Alert Architecture

### Notification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PUSH NOTIFICATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CHANGE DETECTED                BACKEND                APPLE APNS       │
│                                                                         │
│  ┌──────────────┐              ┌──────────────┐         ┌──────────┐    │
│  │ Flight       │              │ Notification │         │ APNS     │    │
│  │ Gate Change  │─────────────▶│ Queue (SQS)  │────────▶│ Gateway  │    │
│  │ LAX T4 → T6  │              │              │         │          │    │
│  └──────────────┘              └──────┬───────┘         └────┬─────┘    │
│                                        │                      │         │
│                                        │                      │         │
│                                        ▼                      ▼         │
│                                 ┌──────────────┐      ┌──────────┐    │
│                                 │ Notification │      │ iOS User │    │
│                                 │ Worker       │      │ Device   │    │
│                                 │              │      │          │    │
│                                 │ - Dequeue    │      │          │    │
│                                 │ - Query user │      │          │    │
│                                 │   prefs      │      │          │    │
│                                 │ - Build      │      │          │    │
│                                 │   payload    │      │          │    │
│                                 │ - Send via   │      │          │    │
│                                 │   APNS       │      │          │    │
│                                 └──────────────┘      └──────────┘    │
│                                        │                      │         │
│                                        │                      │         │
│                                        ▼                      ▼         │
│                                 ┌──────────────────────────────────┐  │
│                                 │        User Device               │  │
│                                 │  ┌────────────────────────────┐  │  │
│                                 │  │ AppDelegate receives      │  │  │
│                                 │  │ push notification         │  │  │
│                                 │  └───────────┬────────────────┘  │  │
│                                 │              │                   │  │
│                                 │              ▼                   │  │
│                                 │  ┌────────────────────────────┐  │  │
│                                 │  │ NotificationManager        │  │  │
│                                 │  │ - Filter (user prefs)     │  │  │
│                                 │  │ - Update in-app UI         │  │  │
│                                 │  │ - Play sound/haptic        │  │  │
│                                 │  │ - Log to history           │  │  │
│                                 │  └────────────────────────────┘  │  │
│                                 └──────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Notification Types & Payloads

#### 1. Gate Change Alert (CRITICAL)
```json
{
    "aps": {
        "alert": {
            "title": "Gate Changed",
            "subtitle": "AA 123 to LAX",
            "body": "Your gate changed from T4-B12 to T6-C22. Gate change detected 2h 15m before departure."
        },
        "badge": 3,
        "sound": "gate_change.caf",
        "category": "GATE_CHANGE",
        "mutable-content": 1
    },
    "flight_id": "AA_123_2025-12-28",
    "old_gate": "T4-B12",
    "new_gate": "T6-C22",
    "terminal": "T6",
    "timestamp": "2025-12-28T10:30:00Z"
}
```

#### 2. Delay Alert (HIGH)
```json
{
    "aps": {
        "alert": {
            "title": "Flight Delayed",
            "subtitle": "AA 123 to LAX",
            "body": "Departure delayed 45 minutes. New departure time: 3:45 PM EST."
        },
        "badge": 2,
        "sound": "delay_alert.caf",
        "category": "DELAY_ALERT"
    },
    "flight_id": "AA_123_2025-12-28",
    "delay_minutes": 45,
    "old_departure": "2025-12-28T15:00:00Z",
    "new_departure": "2025-12-28T15:45:00Z",
    "timestamp": "2025-12-28T10:30:00Z"
}
```

#### 3. Connection Risk Change (HIGH)
```json
{
    "aps": {
        "alert": {
            "title": "Connection Risk Increased",
            "subtitle": "AA 123 → UA 456 at LAX",
            "body": "Your connection risk increased from LOW to MEDIUM. You have 38 minutes between flights."
        },
        "badge": 1,
        "sound": "risk_warning.caf",
        "category": "CONNECTION_RISK"
    },
    "incoming_flight_id": "AA_123_2025-12-28",
    "outgoing_flight_id": "UA_456_2025-12-28",
    "previous_risk": "LOW",
    "current_risk": "MEDIUM",
    "connection_time_minutes": 38,
    "timestamp": "2025-12-28T10:30:00Z"
}
```

### Notification Preferences

Users can customize:
- **Which alerts to receive** (all gate changes, delays >30min only, connection risk changes)
- **Quiet hours** (e.g., 10 PM - 7 AM no non-critical alerts)
- **Per-flight preferences** (only notify me for my outbound journey)
- **Delivery channels** (push, SMS fallback, email digest)

### Notification Worker (Backend Service)

```javascript
// Lambda function triggered by SQS messages
export async function notificationWorker(event) {
    for (const record of event.Records) {
        const message = JSON.parse(record.body);

        // Fetch users tracking this flight
        const subscribers = await getFlightSubscribers(message.flightId);

        for (const subscriber of subscribers) {
            // Check user notification preferences
            const prefs = await getUserNotificationPrefs(subscriber.userId);

            if (shouldSendNotification(message, prefs)) {
                // Build personalized payload
                const payload = buildNotificationPayload(message, subscriber);

                // Send via APNS
                await sendAPNSNotification(subscriber.deviceToken, payload);

                // Log notification
                await logNotification(subscriber.userId, message.type, payload);
            }
        }
    }
}
```

### Notification Latency Targets

| Alert Type | Target Latency | Architecture Target |
|------------|----------------|---------------------|
| Gate Change | < 60s | Ingestion (30s) + Queue processing (10s) + APNS (5s) + Client (15s) |
| Delay Alert | < 90s | Same pipeline, lower priority queue |
| Connection Risk | < 120s | Background recalculation, batched delivery |

---

## Scalability, Reliability & Security

### Scalability Architecture

#### Growth Targets & Infrastructure

| Metric | MVP (Month 6) | Growth (Month 12) | Scale (Month 18) |
|--------|---------------|-------------------|------------------|
| Concurrent Users | 1K | 10K | 100K |
| Tracked Flights | 5K | 50K | 500K |
| API Requests/Day | 50K | 500K | 5M |
| Notifications/Day | 10K | 100K | 1M |
| Database Size | 5 GB | 50 GB | 500 GB |

#### Horizontal Scaling Strategy

**Backend Services:**
- **API Gateway:** Auto Scaling Group (ALB + EC2/ECS)
  - Scale on CPU > 70%
  - Min 2 instances, Max 20 instances
- **Flight Ingestion:** ECS Fargate tasks
  - 1 task per 5,000 active flights
  - Auto-scale based on SQS queue depth
- **Notification Worker:** Lambda functions
  - Auto-scale based on SQS messages
  - Reserved concurrency: 1000

**Database Scaling:**
- **PostgreSQL:** Amazon RDS Multi-AZ
  - MVP: db.t3.large (2 vCPU, 8 GB RAM)
  - Scale: db.r5.4xlarge (16 vCPU, 128 GB RAM)
  - Read replicas for analytics queries
- **Redis:** Amazon ElastiCache Redis
  - MVP: cache.t3.medium (2 vCPU, 3.09 GB RAM)
  - Scale: cache.r5.large (2 vCPU, 13.5 GB RAM) Cluster mode enabled

**Caching Strategy:**
- Redis cluster with sharding for > 50K concurrent users
- Cache warming: Pre-load popular routes during peak hours
- Cache partitioning: Separate instance for user sessions vs flight data

### Reliability Architecture

#### High Availability Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HIGH AVAILABILITY ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                    ┌─────────────────────────────┐                     │
│                    │    Route 53 (DNS)           │                     │
│                    │  - Health checks            │                     │
│                    │  - Failover routing         │                     │
│                    └──────────┬──────────────────┘                     │
│                               │                                         │
│                               ▼                                         │
│                    ┌─────────────────────────────┐                     │
│                    │  Application Load Balancer  │                     │
│                    │  - Cross-AZ routing         │                     │
│                    │  - Health checks            │                     │
│                    └──────────┬──────────────────┘                     │
│                               │                                         │
│         ┌─────────────────────┼─────────────────────┐                 │
│         ▼                     ▼                     ▼                 │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐           │
│  │  AZ: us-1a  │      │  AZ: us-1b  │      │  AZ: us-1c  │           │
│  │             │      │             │      │             │           │
│  │ ┌─────────┐ │      │ ┌─────────┐ │      │ ┌─────────┐ │           │
│  │ │ API GW  │ │      │ │ API GW  │ │      │ │ API GW  │ │           │
│  │ └─────────┘ │      │ └─────────┘ │      │ └─────────┘ │           │
│  │ ┌─────────┐ │      │ ┌─────────┐ │      │ ┌─────────┐ │           │
│  │ │Service  │ │      │ │Service  │ │      │ │Service  │ │           │
│  │ └─────────┘ │      │ └─────────┘ │      │ └─────────┘ │           │
│  └─────────────┘      └─────────────┘      └─────────────┘           │
│         │                     │                     │                 │
│         └─────────────────────┼─────────────────────┘                 │
│                               ▼                                         │
│                    ┌─────────────────────────────┐                     │
│                    │   Amazon RDS PostgreSQL      │                     │
│                    │   - Multi-AZ deployment      │                     │
│                    │   - Automatic failover       │                     │
│                    │   - Read replicas            │                     │
│                    └─────────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Reliability Targets

| Component | Availability Target | SLA | Failure Strategy |
|-----------|--------------------|-----|------------------|
| API Endpoints | 99.9% | 43.8 min/month downtime | ALB health checks, auto AZ failover |
| Database | 99.95% | 21.6 min/month downtime | Multi-AZ with automatic failover (< 30s) |
| Cache | 99.9% | 43.8 min/month downtime | ElastiCache with automatic failover |
| Notifications | 99.5% | 3.6 hours/month downtime | SQS retry with DLQ, manual monitoring |

#### Disaster Recovery

**Backup Strategy:**
- **Database:** Daily automated backups (35-day retention), point-in-time recovery
- **Cache:** No backup (rebuildable from database)
- **Code:** GitHub repository with CI/CD pipeline

**Recovery Time Objectives:**
- **RTO (Recovery Time):** 1 hour (from backup)
- **RPO (Recovery Point):** 5 minutes (data loss max)

### Security Architecture

#### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐ │
│  │  iOS App │       │ API GW   │       │ User Svc │       │Database  │ │
│  └────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬─────┘ │
│       │                  │                  │                  │        │
│       │  1. POST /auth/login │              │                  │        │
│       ├───────────────────▶│                  │                  │        │
│       │                  │                  │                  │        │
│       │                  │  2. Verify credentials              │        │
│       │                  ├─────────────────▶│                  │        │
│       │                  │                  │                  │        │
│       │                  │  3. User + password hash validation │        │
│       │                  │                  ├─────────────────▶│        │
│       │                  │                  │                  │        │
│       │                  │  4. User valid   │                  │        │
│       │                  │◄─────────────────┤                  │        │
│       │                  │                  │                  │        │
│       │  5. Generate JWT (access + refresh)  │                  │        │
│       │                  │                  │                  │        │
│       │  6. Return tokens │                  │                  │        │
│       │◄───────────────────┤                  │                  │        │
│       │                  │                  │                  │        │
│       │  7. Store tokens securely (Keychain) │                  │        │
│       │                  │                  │                  │        │
│  ┌────┴─────┐       ┌────┴─────┐       ┌────┴─────┐       ┌────┴─────┐ │
│  │  iOS App │       │ API GW   │       │ User Svc │       │Database  │ │
│  └──────────┘       └──────────┘       └──────────┘       └──────────┘ │
│                                                                         │
│  SUBSEQUENT REQUESTS:                                                  │
│  ┌──────┐      ┌──────┐      ┌──────┐                                  │
│  │ iOS  │─────▶│ API  │─────▶│ Valid│─┐                                │
│  │ App  │ JWT  │ GW   │ JWT  │ JWT  │ │ Validate signature              │
│  └──────┘      └──────┘      └──────┘ │ Extract user_id                 │
│                                          │ Check expiry                  │
│                                          ▼                                │
│                                    Allow/Deny                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Security Measures

**Authentication:**
- OAuth 2.0 / JWT-based stateless authentication
- Access token: 15-minute expiry, stored in memory (secure)
- Refresh token: 30-day expiry, stored in iOS Keychain
- Token rotation on refresh (invalidate old refresh token)
- Password hashing: bcrypt with salt rounds = 12

**Authorization:**
- Role-based access control (RBAC): USER, PREMIUM, ADMIN
- Resource-based access: users can only access their own data
- API-level authorization middleware on all protected endpoints

**Transport Security:**
- TLS 1.3 for all network communication
- Certificate pinning in iOS app (prevent MITM attacks)
- HSTS (HTTP Strict Transport Security) enabled

**Data Security:**
- Encryption at rest: AES-256 for database, S3 storage
- Encryption in transit: TLS 1.3
- Sensitive data (device tokens) encrypted in database
- PII data stored in us-east-1 (US region)

**API Security:**
- Rate limiting: 100 req/hour (free), 1000 req/hour (premium)
- Request signing: HMAC for sensitive operations
- CORS: Whitelist-only domains (none for mobile API)
- Input validation: JSON schema validation on all endpoints

**Privacy Compliance:**
- GDPR compliance: Right to data deletion, data export
- CCPA compliance: Do not sell my data option
- Privacy policy: Clear disclosure of data collection
- Minimal data collection: Only necessary data stored

#### Security Monitoring

- **Logging:** CloudTrail for API calls, CloudWatch for application logs
- **Alerting:** SNS alerts for suspicious activity (failed auth, rate limit exceeded)
- **Auditing:** Immutable audit log for all data access/modifications
- **Penetration Testing:** Quarterly third-party security audits (Phase 2+)

---

## Technology Stack

### Frontend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language** | Swift 5.9+ | Native iOS performance, modern features |
| **UI Framework** | SwiftUI | Apple's future, declarative UI, previews |
| **Min iOS Version** | iOS 15 | 99%+ device coverage, async/await support |
| **Networking** | URLSession | Native, no external dependency |
| **Local Database** | Core Data | Apple's persistence framework, integrates with iCloud |
| **Push Notifications** | APNs (Apple Push Notification Service) | Native, low latency |
| **Maps** | MapKit | Native maps integration |
| **Dependency Management** | Swift Package Manager (SPM) | Native, no external tools needed |
| **CI/CD** | GitHub Actions | Free for public repos, excellent iOS support |

**Key Libraries (SPM):**
- `async-http-client` - Async HTTP client
- `KeychainAccess` - Secure Keychain wrapper
- `SwiftUIIntrospect` - UIKit to SwiftUI bridge (if needed)

### Backend Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language** | TypeScript | Type safety, large ecosystem |
| **Runtime** | Node.js 20 LTS | Non-blocking I/O, great for real-time |
| **Framework** | Fastify | Fastest Node.js web framework, TypeScript-first |
| **API Style** | REST + JSON | Standard, widely supported |
| **ORM** | Prisma | Type-safe database client, migrations |
| **Database** | PostgreSQL 15 | Relational, ACID compliant, JSON support |
| **Cache** | Redis 7 | In-memory, sub-millisecond reads |
| **Queue** | AWS SQS | Managed message queue, unlimited scale |
| **Authentication** | JWT (jsonwebtoken) | Stateless, standard |
| **Validation** | Zod | TypeScript-first schema validation |
| **Logging** | Pino + CloudWatch | Structured JSON logging |
| **Testing** | Jest + Supertest | Unit + integration tests |
| **CI/CD** | GitHub Actions | Integrated with GitHub |

### Infrastructure Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Cloud Provider** | AWS | Market leader, comprehensive services |
| **Compute** | AWS ECS (Fargate) | Serverless containers, auto-scaling |
| **Load Balancer** | ALB (Application Load Balancer) | Layer 7 routing, health checks |
| **Database** | Amazon RDS PostgreSQL | Managed database, automated backups |
| **Cache** | Amazon ElastiCache Redis | Managed Redis, automatic failover |
| **Queue** | AWS SQS | Managed message queue |
| **Notifications** | AWS SNS + APNS | Push notification delivery |
| **Storage** | Amazon S3 | Object storage for static assets |
| **CDN** (Phase 2) | CloudFront | Global content delivery |
| **Monitoring** | CloudWatch + X-Ray | Metrics, logs, distributed tracing |
| **Secrets** | AWS Secrets Manager | Secure secret storage |
| **DNS** | Route 53 | Managed DNS, health checks |
| **SSL/TLS** | AWS Certificate Manager | Free SSL certificates |

---

## Deployment Architecture

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CI/CD PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DEVELOPER                    CI/CD                    PRODUCTION      │
│                                                                         │
│  ┌──────────┐               ┌──────────┐             ┌──────────┐      │
│  │  Git     │──────────────▶│  GitHub  │─────────────▶│   AWS    │      │
│  │  Push    │               │  Actions │             │  ECS/EKS  │      │
│  └──────────┘               └────┬─────┘             └──────────┘      │
│                                   │                                     │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌──────────────────┐                           │
│                          │   Test Stage     │                           │
│                          │  - Unit tests    │                           │
│                          │  - Lint (ESLint) │                           │
│                          │  - Type check    │                           │
│                          └────────┬─────────┘                           │
│                                   │                                     │
│                                   │ (on main branch)                    │
│                                   ▼                                     │
│                          ┌──────────────────┐                           │
│                          │   Build Stage    │                           │
│                          │  - Docker build  │                           │
│                          │  - Push to ECR   │                           │
│                          └────────┬─────────┘                           │
│                                   │                                     │
│                                   │ (manual approval)                   │
│                                   ▼                                     │
│                          ┌──────────────────┐                           │
│                          │  Deploy Stage    │                           │
│                          │  - Blue/Green    │                           │
│                          │  - Smoke tests   │                           │
│                          │  - Route traffic │                           │
│                          └────────┬─────────┘                           │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌──────────────────┐                           │
│                          │   Monitoring     │                           │
│                          │  - CloudWatch    │                           │
│                          │  - PagerDuty     │                           │
│                          └──────────────────┘                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Deployment Strategy

**Backend Deployment:**
- **Strategy:** Blue-Green deployment with zero downtime
- **Process:**
  1. Deploy new version to green environment
  2. Run smoke tests against green
  3. Shift ALB traffic: 100% blue → 50% blue/50% green → 100% green
  4. Monitor for 15 minutes
  5. Terminate blue environment if successful, rollback if not

**iOS App Deployment:**
- **Development:** TestFlight for beta testing
- **Production:** App Store review process (1-3 days)
- **Strategy:** Force update mechanism for critical API changes

### Environment Configuration

| Environment | Purpose | Database | Cache | API Rate Limit |
|-------------|---------|----------|-------|----------------|
| **Development** | Local development | Local PostgreSQL | Local Redis | Unlimited |
| **Staging** | Pre-production testing | AWS RDS (dev) | AWS ElastiCache (dev) | 1000 req/hour |
| **Production** | Live users | AWS RDS Multi-AZ | AWS ElastiCache Multi-AZ | 100 req/hour (free) |

### Database Migration Strategy

- **Tool:** Prisma Migrate
- **Strategy:** Zero-downtime migrations
- **Process:**
  1. Create migration script
  2. Review in code review
  3. Apply to staging first
  4. Apply to production during low-traffic window (2-4 AM EST)
  5. Verify and rollback plan ready

---

## Cost Optimization Strategy

### AWS Infrastructure Costs (Monthly Estimates)

| Service | MVP (1K users) | Growth (10K users) | Scale (100K users) |
|---------|----------------|--------------------|--------------------|
| **ECS Fargate** | $30 | $150 | $600 |
| **ALB** | $20 | $20 | $20 |
| **RDS PostgreSQL** | $50 | $200 | $800 |
| **ElastiCache Redis** | $25 | $100 | $400 |
| **SQS** | $1 | $5 | $20 |
| **SNS + APNS** | Free | $5 | $20 |
| **S3** | $1 | $5 | $20 |
| **CloudWatch** | $10 | $30 | $100 |
| **Data Transfer** | $10 | $50 | $200 |
| **Infrastructure Total** | **$147** | **$565** | **$2,180** |

### Aviation API Costs (Critical Constraint)

| Tier | Monthly Cost | API Calls/Day | Users Supported |
|------|-------------|---------------|-----------------|
| **FlightAware Basic** | $5,000 | 5,000 | 10K users (aggressive caching) |
| **FlightAware Plus** | $15,000 | 15,000 | 30K users |
| **FlightAware Enterprise** | $50,000 | 50,000 | 100K users |

**Cost Per User Breakdown:**
- Target: $0.50/user/month
- With 10K users: $5,000 API / 10K = $0.50/user/month ✓
- With infrastructure costs: ($5,000 + $565) / 10K = $0.56/user/month

### Cost Optimization Techniques

1. **Aggressive Caching (80%+ cache hit rate)**
   - 60-second TTL on all flight data
   - Pre-warm cache for popular routes
   - Share cache across all users tracking same flight

2. **Smart Polling**
   - Prioritize flights by subscriber count
   - Batch API calls (50 flights per call)
   - Skip polling for flights departed > 2 hours ago

3. **User Quotas**
   - Free tier: 5 tracked flights maximum
   - Premium tier: Unlimited tracked flights
   - Incentivizes users to upgrade

4. **Data Deduplication**
   - Single API call serves all users tracking the same flight
   - Historical delay data cached and reused

5. **Infrastructure Optimization**
   - Use Reserved Instances for predictable compute workloads
   - S3 Intelligent Tiering for cost-effective storage
   - CloudWatch Logs retention: 7 days (not 30 days)

---

## Migration Path

### Phase 1: MVP (Months 1-6)

**Scope:**
- iOS app only
- Single aviation API (FlightAware Basic)
- 60-second caching
- Core features: Flight tracking, gate changes, connection risk

**Architecture:**
- Monolithic backend
- Single RDS instance (Multi-AZ)
- Single Redis instance
- Manual deployment

**Success Criteria:**
- 1,000 active users
- 5,000 tracked flights
- < 60s notification latency

### Phase 2: Growth (Months 7-12)

**Enhancements:**
- Android app (React Native or Kotlin)
- Premium subscription launch
- Advanced connection risk (ML-based)
- Airport maps integration

**Architecture:**
- Extract Flight Ingestion Service
- Read replicas for analytics
- CI/CD automation
- Automated testing

**Success Criteria:**
- 10,000 active users
- 50,000 tracked flights
- $0.50/user/month cost

### Phase 3: Scale (Months 13-18)

**Enhancements:**
- Predictive delays (ML models)
- Calendar integration
- Multi-region deployment
- Real-time flight positions (WebSocket)

**Architecture:**
- Microservices architecture
- Kubernetes (EKS)
- Multi-region (US + EU)
- Advanced ML pipeline

**Success Criteria:**
- 100,000 active users
- 500,000 tracked flights
- Profitable at $4.99/month subscription

---

## Appendix: Architecture Decision Records (ADRs)

### ADR-001: iOS Native vs PWA

**Status:** Accepted
**Context:** Frontend platform selection for MVP
**Decision:** iOS Native (SwiftUI)
**Rationale:**
- Push notification latency (< 30s vs 2-5s)
- Offline flight tracking (critical use case)
- App Store discoverability
- Future-proof (Android in Phase 2)

### ADR-002: SwiftUI vs UIKit

**Status:** Accepted
**Context:** iOS UI framework selection
**Decision:** SwiftUI (iOS 15+ target)
**Rationale:**
- Modern declarative UI
- Native async/await support
- Apple's future direction
- Faster development with previews

### ADR-003: PostgreSQL vs MongoDB

**Status:** Accepted
**Context:** Primary database selection
**Decision:** PostgreSQL
**Rationale:**
- Relational data model (users, flights, subscriptions)
- ACID compliance for financial transactions
- JSON support for unstructured data
- Better for complex queries (connections, risk analysis)

### ADR-004: Node.js vs Python vs Go

**Status:** Accepted
**Context:** Backend runtime selection
**Decision:** Node.js (TypeScript)
**Rationale:**
- Non-blocking I/O (real-time features)
- TypeScript type safety
- Largest ecosystem (npm)
- Full-stack JavaScript (code sharing)

### ADR-005: REST vs GraphQL

**Status:** Accepted
**Context:** API architecture style
**Decision:** REST
**Rationale:**
- Simpler to implement
- Better caching (HTTP cache headers)
- Standardized status codes
- GraphQL complexity not justified for MVP

---

## Conclusion

This architecture provides a **scalable, cost-effective foundation** for AeroSense that:

1. **Addresses the critical API cost constraint** through aggressive multi-layer caching
2. **Enables sub-60 second notification latency** for gate changes via efficient ingestion pipeline
3. **Scales from 1K to 100K users** with horizontal scaling and microservices-ready design
4. **Prioritizes user experience** with iOS native app, offline support, and real-time updates
5. **Controls costs** at $0.56/user/month for infrastructure + API at 10K users

The architecture balances **MVP speed** (monolithic, single API provider) with **future scalability** (microservices-ready, multi-region).

**Next Steps:**
1. Frontend team: Begin iOS app development with SwiftUI
2. Backend team: Implement Flight API and authentication endpoints
3. DevOps team: Set up AWS infrastructure and CI/CD pipeline
4. QA team: Design integration tests for notification latency
5. Product team: Prepare App Store listing and marketing materials

---

**Document Version:** 1.0
**Last Updated:** 2025-12-28
**Owner:** Winston (Architect)
**Reviewers:** Mary (Analyst), John (PM), Sally (UX Expert)
