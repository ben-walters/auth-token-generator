// auth-generator.ts

import { Buffer } from 'buffer';
import { KeyObject, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

// ... (interfaces remain the same) ...
interface TenantDetails {
  r: string;
  p: string[];
}

type TenantMap = Record<string, TenantDetails>;

interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  verified: boolean;
  accountType: string;
  imageUrl?: string;
  permissions: string[];
}

interface TokenPayloadOptions {
  email: string;
  firstName?: string;
  lastName?: string;
  permissions?: string[];
  id?: string;
  createdAt?: string;
  verified?: boolean;
  accountType?: string;
  imageUrl?: string;
  masterKey?: string;
}

interface TenantPermissions {
  id: string;
  role: string;
  permissions: string[];
}

export class AccessTokenGenerator {
  public user: UserPayload;
  public tenants: TenantMap = {};
  public baseTenants: TenantMap = {};
  public masterKey?: string;

  private readonly type: string;
  private readonly issuer: string = 'my-issuer';
  // v-- UPDATE the type here
  private readonly signingKey: string | Buffer | KeyObject;
  private readonly algorithm: jwt.Algorithm;

  constructor(params: {
    payloadOptions: TokenPayloadOptions;
    // v-- AND update the type here
    signingKey: string | Buffer | KeyObject;
    algorithm?: jwt.Algorithm;
    tenants?: TenantPermissions[];
    issuer?: string;
    type?: string;
  }) {
    const algo = params.algorithm ?? 'HS256';
    if (Buffer.isBuffer(params.signingKey) && algo === 'HS256') {
      console.warn(
        "Warning: Using a Buffer key with the default 'HS256' algorithm. " +
          "Consider specifying an asymmetric algorithm like 'RS256'."
      );
    }

    this.signingKey = params.signingKey;
    this.algorithm = algo;

    this.user = {
      email: params.payloadOptions.email,
      id: params.payloadOptions.id ?? randomUUID(),
      createdAt: params.payloadOptions.createdAt ?? new Date().toISOString(),
      verified: params.payloadOptions.verified ?? true,
      accountType: params.payloadOptions.accountType ?? 'User',
      permissions: params.payloadOptions.permissions ?? [],
      firstName: params.payloadOptions.firstName,
      lastName: params.payloadOptions.lastName,
      imageUrl: params.payloadOptions.imageUrl,
    };

    const tenants: TenantMap = {};

    if (
      params.tenants &&
      Array.isArray(params.tenants) &&
      params.tenants.length > 0
    ) {
      params.tenants.forEach((tenant) => {
        tenants[tenant.id] = {
          r: tenant.role,
          p: tenant.permissions,
        };
      });
    }

    this.tenants = tenants;
    this.baseTenants = { ...tenants };

    this.masterKey = params.payloadOptions.masterKey;
    this.type = this.type = params.type ?? 'access';
    this.issuer = params.issuer ?? 'my-issuer';
  }

  // ... (rest of the class methods are unchanged) ...
  public addTenant(tenant: TenantPermissions): this {
    this.tenants[tenant.id] = {
      r: tenant.role,
      p: tenant.permissions,
    };
    return this;
  }

  public removeTenant(tenantId: string): this {
    delete this.tenants[tenantId];
    return this;
  }

  public reset(): this {
    this.tenants = { ...this.baseTenants };
    return this;
  }

  public getJWT(opts: { expiresAt?: Date; expiredIn?: string }): string {
    const payload = {
      typ: this.type,
      user: this.user,
      tenants: this.tenants,
      ...(this.masterKey && { masterKey: this.masterKey }),
    };

    const options: jwt.SignOptions = {
      issuer: this.issuer,
      algorithm: this.algorithm,
    };

    if (opts.expiresAt) {
      options.expiresIn = Math.ceil(
        (opts.expiresAt.getTime() - Date.now()) / 1000
      );
    } else if (opts.expiredIn) {
      options.expiresIn = opts.expiredIn as jwt.SignOptions['expiresIn'];
    } else {
      options.expiresIn = '15m'; // Default expiration time
    }

    return jwt.sign(payload, this.signingKey, options);
  }
}
