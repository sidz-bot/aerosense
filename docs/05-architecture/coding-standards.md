# AeroSense Coding Standards

**Version:** 1.0
**Last Updated:** 2025-12-28
**Status:** Final

---

## Overview

This document defines the coding standards and conventions for the AeroSense project. All developers must follow these standards to ensure code consistency, maintainability, and quality.

---

## General Principles

### Code Quality Standards

| Standard | Target | Tool |
|----------|--------|------|
| Type Safety | 100% TypeScript/Swift | Compiler |
| Code Coverage | 80%+ | Jest / XCTest |
| Linting | Zero warnings | ESLint / SwiftLint |
| Complexity | Cyclomatic complexity < 10 | SonarQube |
| Function Length | < 50 lines | Review |
| File Length | < 500 lines | Review |

### Core Values

1. **Readability First** - Code is read more than written
2. **Explicit over Implicit** - Clear names, no magic values
3. **DRY** - Don't Repeat Yourself (but don't be DRY at the expense of clarity)
4. **SOLID** - Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
5. **Fail Fast** - Validate inputs early, throw meaningful errors

---

## TypeScript (Backend) Standards

### File Naming

| Type | Convention | Example |
|------|-------------|---------|
| Files | `camelCase.ts` | `flightService.ts` |
| Interfaces/Types | `PascalCase` | `Flight`, `User` |
| Enums | `PascalCase` | `FlightStatus` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FLIGHTS` |
| Private | Underscore prefix | `_internalCache` |

### Code Organization

```typescript
// 1. Imports (grouped and sorted)
import { external } from 'library';
import { internal } from '@module';

// 2. Type definitions
interface MyInterface {}
type MyType = {};

// 3. Constants
const CONSTANT = 'value';

// 4. Class/Function
class MyClass {
  // public
  // protected
  // private
}

// 5. Exports
export { MyClass };
```

### Type Definitions

```typescript
// ✅ Good: Explicit, named types
interface Flight {
  id: string;
  airlineCode: string;
  status: FlightStatus;
}

type FlightStatus = 'SCHEDULED' | 'DELAYED' | 'IN_AIR' | 'LANDED';

// ❌ Bad: Implicit any, unclear types
const flight = {
  id: '123',
  status: 'delayed'
};
```

### Error Handling

```typescript
// ✅ Good: Explicit error types
class FlightNotFoundError extends Error {
  constructor(public flightId: string) {
    super(`Flight not found: ${flightId}`);
    this.name = 'FlightNotFoundError';
  }
}

// Use early returns for error handling
async function getFlight(id: string): Promise<Flight> {
  const flight = await db.find(id);
  if (!flight) {
    throw new FlightNotFoundError(id);
  }
  return flight;
}

// ❌ Bad: Generic errors
throw new Error('Error');
```

### Async/Await

```typescript
// ✅ Good: async/await with error handling
async function fetchFlight(id: string): Promise<Flight> {
  try {
    const response = await api.get(`/flights/${id}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch flight', { id, error });
    throw new ApiError('Failed to fetch flight', { cause: error });
  }
}

// ❌ Bad: Nested callbacks
api.get(`/flights/${id}`, (response) => {
  // nested callback hell
});
```

### Comments

```typescript
// ✅ Good: Self-documenting code, comments explain "why"
// Cache TTL must be 60 seconds to meet API cost targets
const CACHE_TTL = 60;

// ❌ Bad: Comments that repeat the code
// Set cache TTL to 60 seconds
const ttl = 60; // Cache TTL in seconds

// ❌ Bad: Commented-out code
// const oldFunction = () => { ... };
```

---

## Swift (iOS) Standards

### File Naming

| Type | Convention | Example |
|------|-------------|---------|
| Files | `PascalCase.swift` | `FlightListView.swift` |
| Protocols | `PascalCase` | `FlightServiceProtocol` |
| Enums | `PascalCase` | `FlightStatus` |
| Structs | `PascalCase` | `Flight` |
| Classes | `PascalCase` | `FlightListViewModel` |
| Extensions | `PascalCase+Type.swift` | `String+Extensions.swift` |

### Code Organization

```swift
// 1. Imports
import SwiftUI
import Combine

// 2. Type definition
struct FlightListView: View {
    // 3. Properties
    // 4. Body
    // 5. Private computed properties
    // 6. Private methods
}
```

### SwiftUI Standards

```swift
// ✅ Good: View composition, single responsibility
struct FlightListView: View {
    @ObservedObject var viewModel: FlightListViewModel

    var body: some View {
        List(viewModel.flights) { flight in
            FlightRow(flight: flight)
        }
    }
}

// ✅ Good: ViewModel separates business logic
@MainActor
class FlightListViewModel: ObservableObject {
    @Published var flights: [Flight] = []
    @Published var isLoading = false

    private let service: FlightService

    func loadFlights() async {
        isLoading = true
        defer { isLoading = false }
        flights = await service.getFlights()
    }
}
```

### Property Wrappers

```swift
// ✅ Good: Explicit wrapper usage
@State private var text: String = ""
@Published var data: [Flight] = []
@ObservedObject var viewModel: FlightListViewModel
@Environment(\.colorScheme) var colorScheme
```

### Optionals

```swift
// ✅ Good: Explicit unwrapping with guard
guard let id = flightId else {
    return
}

// ✅ Good: Implicit unwrapping when safe
let cell = tableView.dequeueReusableCell(withIdentifier: "Cell") as! Cell

// ❌ Bad: Force unwrap without validation
let value = optional!
```

---

## API Design Standards

### RESTful Conventions

```typescript
// ✅ Good: Resource-based URLs, standard HTTP methods
GET    /api/v1/flights              // List flights
GET    /api/v1/flights/:id          // Get specific flight
POST   /api/v1/flights              // Create flight
PATCH  /api/v1/flights/:id          // Update flight
DELETE /api/v1/flights/:id          // Delete flight

// ✅ Good: Query parameters for filtering
GET /api/v1/flights?status=DELAYED&date=2025-01-15

// ✅ Good: Nested resources
GET /api/v1/flights/:id/connections
```

### Response Format

```typescript
// ✅ Good: Consistent response wrapper
interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
    cached?: boolean;
  };
}

// ✅ Good: Consistent error format
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

### HTTP Status Codes

| Code | Usage | Example |
|------|--------|---------|
| 200 | Success | GET /flights/:id |
| 201 | Created | POST /flights |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Flight doesn't exist |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Unexpected error |

---

## Testing Standards

### Unit Tests

```typescript
// ✅ Good: Clear test names, AAA pattern (Arrange, Act, Assert)
describe('FlightService', () => {
  describe('calculateConnectionRisk', () => {
    it('returns CRITICAL risk when buffer < 20 minutes', async () => {
      // Arrange
      const incoming = createMockFlight({ delayMinutes: 30 });
      const outgoing = createMockFlight({});

      // Act
      const result = await flightService.calculateConnectionRisk(
        incoming.id,
        outgoing.id
      );

      // Assert
      expect(result.risk.level).toBe(ConnectionRiskLevel.CRITICAL);
    });
  });
});
```

### Integration Tests

```typescript
// ✅ Good: Tests API contracts
describe('GET /api/v1/flights/:id', () => {
  it('returns 404 for non-existent flight', async () => {
    const response = await request(app)
      .get('/api/v1/flights/nonexistent')
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchSchema({
          error: {
            code: 'FLIGHT_NOT_FOUND',
            message: expect.any(String)
          }
        });
      });
  });
});
```

---

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring (no behavior change) |
| `docs` | Documentation only |
| `test` | Add/update tests |
| `chore` | Maintenance, config, dependencies |
| `style` | Code style/formatting (no logic change) |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

### Example

```
feat(flights): add connection risk calculation

Implements connection risk algorithm that analyzes:
- Scheduled buffer time
- Current flight delays
- Gate distance between terminals
- Historical on-time performance

Closes #123
```

---

## Code Review Checklist

Before submitting PR, verify:

- [ ] Code follows style guide (ESLint/SwiftLint pass)
- [ ] Tests added/updated (80%+ coverage maintained)
- [ ] Comments explain "why" not "what"
- [ ] No commented-out code
- [ ] No console.log or debug statements
- [ ] Error handling implemented
- [ ] No hard-coded values (use constants/config)
- [ ] Async operations properly handled
- [ ] Sensitive data not logged
- [ ] Commit messages follow conventions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-28 | Initial coding standards definition |
