/**
 * Integration Tests: Authentication Routes
 * PHASE 7 - Testing & Quality Gate
 *
 * Tests actual HTTP endpoints with Fastify
 * No production calls - uses in-memory database mocks
 */

import { setupTestApp, teardownTestApp } from '../helper';
import type { FastifyInstance } from 'fastify';

describe('Auth Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  // ===========================================================================
  // POST /auth/register
  // ===========================================================================

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
          }),
          tokens: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        }),
      });
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: expect.stringContaining('VALIDATION'),
        }),
      });
    });

    it('should return 400 for weak password', async () => {
      // Arrange
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: '123', // Too weak
        firstName: 'Test',
        lastName: 'User',
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: expect.stringContaining('VALIDATION'),
        }),
      });
    });

    it('should return 400 for duplicate email', async () => {
      // Arrange
      const userData = {
        email: `duplicate-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      // First registration
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      // Second registration with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: userData,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        success: false,
      });
    });
  });

  // ===========================================================================
  // POST /auth/login
  // ===========================================================================

  describe('POST /auth/login', () => {
    let userEmail: string;
    let userPassword: string;

    beforeEach(async () => {
      // Create a test user
      userEmail = `login-${Date.now()}@example.com`;
      userPassword = 'SecurePassword123!';

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: userEmail,
          password: userPassword,
          firstName: 'Test',
          lastName: 'User',
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: userEmail,
          password: userPassword,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: expect.objectContaining({
          user: expect.objectContaining({
            email: userEmail,
          }),
          tokens: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        }),
      });
    });

    it('should return 401 for invalid password', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: userEmail,
          password: 'WrongPassword123!',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_CREDENTIALS',
        }),
      });
    });

    it('should return 401 for non-existent user', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'DoesNotMatter123!',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        success: false,
      });
    });
  });

  // ===========================================================================
  // POST /auth/refresh
  // ===========================================================================

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login a user
      const userEmail = `refresh-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: userEmail,
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      refreshToken = registerResponse.json().data.tokens.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {
          refreshToken: 'invalid.refresh.token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        success: false,
      });
    });
  });

  // ===========================================================================
  // GET /auth/me (Protected)
  // ===========================================================================

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a user
      const userEmail = `me-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: userEmail,
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      accessToken = registerResponse.json().data.tokens.accessToken;
    });

    it('should return user profile for authenticated user', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: expect.objectContaining({
          email: expect.any(String),
          firstName: expect.any(String),
          lastName: expect.any(String),
        }),
      });
    });

    it('should return 401 for missing auth header', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid.token.here',
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
    });
  });

  // ===========================================================================
  // POST /auth/logout (Protected)
  // ===========================================================================

  describe('POST /auth/logout', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a user
      const userEmail = `logout-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: userEmail,
          password: 'SecurePassword123!',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      accessToken = registerResponse.json().data.tokens.accessToken;
    });

    it('should logout successfully', async () => {
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: expect.objectContaining({
          message: 'Logged out successfully',
        }),
      });
    });
  });
});
