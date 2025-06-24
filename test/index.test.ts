import { AccessTokenGenerator } from '../src/index';
import * as jwt from 'jsonwebtoken';
import { randomUUID, generateKeyPairSync, KeyObject } from 'crypto';
import { Buffer } from 'buffer';

// Mock the crypto.randomUUID function to return a predictable value for tests
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

const mockRandomUUID = randomUUID as jest.Mock;

describe('AccessTokenGenerator', () => {
  const signingKey = 'your-super-secret-key-that-is-long-enough-for-hs256';
  const basicPayload = { email: 'test@example.com' };
  const fixedUUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
  const fixedDate = new Date('2025-06-24T10:00:00.000Z');
  const fixedDateISO = fixedDate.toISOString();

  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Use fake timers to control Date.now() and new Date() reliably
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);

    mockRandomUUID.mockReturnValue(fixedUUID);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore real timers and all other mocks
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create an instance with minimal required options', () => {
      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
      });
      expect(generator).toBeInstanceOf(AccessTokenGenerator);
      expect(generator.user.email).toBe(basicPayload.email);
    });

    it('should assign default values for optional properties', () => {
      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
      });
      expect(generator.user.id).toBe(fixedUUID);
      expect(generator.user.createdAt).toBe(fixedDateISO);
      expect(generator.user.verified).toBe(true);
      expect(generator.user.accountType).toBe('User');
      expect(generator.user.permissions).toEqual([]);
      expect(generator.tenants).toEqual({});
      expect(generator.baseTenants).toEqual({});
    });

    it('should assign all provided payload options', () => {
      const fullPayload = {
        id: 'user-123',
        email: 'full@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date('2024-01-01').toISOString(),
        verified: false,
        accountType: 'Admin',
        imageUrl: 'http://example.com/img.png',
        permissions: ['read:data'],
        masterKey: 'master-secret',
      };
      const generator = new AccessTokenGenerator({
        payloadOptions: fullPayload,
        signingKey,
      });

      expect(generator.user.id).toBe(fullPayload.id);
      expect(generator.user.email).toBe(fullPayload.email);
      expect(generator.user.firstName).toBe(fullPayload.firstName);
      expect(generator.user.lastName).toBe(fullPayload.lastName);
      expect(generator.user.createdAt).toBe(fullPayload.createdAt);
      expect(generator.user.verified).toBe(fullPayload.verified);
      expect(generator.user.accountType).toBe(fullPayload.accountType);
      expect(generator.user.imageUrl).toBe(fullPayload.imageUrl);
      expect(generator.user.permissions).toEqual(fullPayload.permissions);
      expect(generator.masterKey).toBe(fullPayload.masterKey);
    });

    it('should initialize tenants and baseTenants correctly', () => {
      const tenants = [{ id: 'tenant1', role: 'admin', permissions: ['*'] }];
      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
        tenants,
      });

      const expectedTenants = {
        tenant1: { r: 'admin', p: ['*'] },
      };
      expect(generator.tenants).toEqual(expectedTenants);
      expect(generator.baseTenants).toEqual(expectedTenants);
    });

    it('should warn when using a Buffer key with the default HS256 algorithm', () => {
      new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey: Buffer.from(signingKey),
      });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Warning: Using a Buffer key with the default 'HS256' algorithm. " +
          "Consider specifying an asymmetric algorithm like 'RS256'."
      );
    });

    it('should NOT warn when using a KeyObject with an RS256 algorithm', () => {
      const { privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });
      new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey: privateKey,
        algorithm: 'RS256',
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Tenant Management', () => {
    let generator: AccessTokenGenerator;

    beforeEach(() => {
      const initialTenants = [
        { id: 'tenant1', role: 'member', permissions: ['read'] },
      ];
      generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
        tenants: initialTenants,
      });
    });

    it('addTenant should add a new tenant and be chainable', () => {
      const newTenant = { id: 'tenant2', role: 'admin', permissions: ['*'] };
      const result = generator.addTenant(newTenant);

      expect(generator.tenants['tenant2']).toEqual({
        r: 'admin',
        p: ['*'],
      });
      expect(result).toBe(generator); // Check for chainability
    });

    it('removeTenant should remove an existing tenant and be chainable', () => {
      const result = generator.removeTenant('tenant1');
      expect(generator.tenants['tenant1']).toBeUndefined();
      expect(result).toBe(generator); // Check for chainability
    });

    it('removeTenant should not throw an error when removing a non-existent tenant', () => {
      expect(() =>
        generator.removeTenant('non-existent-tenant-id')
      ).not.toThrow();
      expect(generator.tenants['tenant1']).toBeDefined(); // Original tenant is untouched
    });

    it('reset should restore tenants to their initial state after modifications', () => {
      generator
        .addTenant({ id: 'new-tenant', role: 'guest', permissions: [] })
        .removeTenant('tenant1');

      expect(generator.tenants).not.toEqual(generator.baseTenants);

      const result = generator.reset();

      expect(generator.tenants).toEqual(generator.baseTenants);
      expect(result).toBe(generator); // Check for chainability
    });

    it('reset should do nothing if the base tenant list is empty', () => {
      const emptyGenerator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
      });
      emptyGenerator.addTenant({
        id: 'temp-tenant',
        role: 'admin',
        permissions: ['*'],
      });

      expect(Object.keys(emptyGenerator.tenants)).toHaveLength(1);
      expect(Object.keys(emptyGenerator.baseTenants)).toHaveLength(0);

      emptyGenerator.reset();

      expect(Object.keys(emptyGenerator.tenants)).toHaveLength(0);
    });
  });

  describe('getJWT', () => {
    it('should generate a valid JWT with default expiration (15m)', () => {
      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
      });
      const token = generator.getJWT({});
      const decoded = jwt.verify(token, signingKey) as jwt.JwtPayload;

      expect(decoded.iss).toBe('my-issuer');
      expect(decoded.user.email).toBe(basicPayload.email);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp! - decoded.iat!).toBe(15 * 60);
    });

    it('should generate a JWT with custom expiration using expiredIn', () => {
      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
      });
      const token = generator.getJWT({ expiredIn: '2h' });
      const decoded = jwt.verify(token, signingKey) as jwt.JwtPayload;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp! - decoded.iat!).toBe(2 * 60 * 60);
    });

    it('should generate a JWT with custom expiration using expiresAt', () => {
      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey,
      });
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from "now"
      const token = generator.getJWT({ expiresAt });
      const decoded = jwt.verify(token, signingKey) as jwt.JwtPayload;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp!).toBeCloseTo(Math.floor(expiresAt.getTime() / 1000));
    });

    it('should include masterKey in the payload when provided', () => {
      const generator = new AccessTokenGenerator({
        payloadOptions: { ...basicPayload, masterKey: 'master-secret' },
        signingKey,
      });
      const token = generator.getJWT({});
      const decoded = jwt.verify(token, signingKey) as jwt.JwtPayload;

      expect(decoded.masterKey).toBe('master-secret');
    });

    it('should generate and verify a token with RS256 algorithm', () => {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const generator = new AccessTokenGenerator({
        payloadOptions: basicPayload,
        signingKey: privateKey,
        algorithm: 'RS256',
      });

      const token = generator.getJWT({});
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as jwt.JwtPayload;

      expect(decoded.user.email).toBe(basicPayload.email);
    });
  });
});
