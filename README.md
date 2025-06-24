# Access Token Generator

[![NPM Version](https://img.shields.io/npm/v/auth-token-generator.svg)](https://www.npmjs.com/package/auth-token-generator)
[![CI](https://github.com/ben-walters/auth-token-generator/actions/workflows/release.yaml/badge.svg)](https://github.com/ben-walters/auth-token-generator/actions)
[![codecov](https://codecov.io/gh/ben-walters/auth-token-generator/graph/badge.svg)](https://codecov.io/gh/ben-walters/auth-token-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust utility for generating JSON Web Tokens (JWTs) with support for tenant-based permissions, user payload customization, and flexible signing options. This package is ideal for applications requiring secure and scalable authentication and authorization mechanisms.

## Features

- **Tenant-Based Permissions**: Easily manage user roles and permissions across multiple tenants.
- **Customizable Payload**: Define user-specific payload options, including metadata like account type, verification status, and more.
- **Flexible Signing Options**: Supports symmetric and asymmetric algorithms for signing tokens.
- **Built-in Expiration Handling**: Configure token expiration with absolute or relative time settings.
- **TypeScript Support**: Fully typed interfaces for payloads, tenants, and configuration options.

## Installation

```bash
npm install access-token-generator
```

```bash
yarn add access-token-generator
```

## Usage

This library is designed to simplify the process of generating JWTs for authentication and authorization.

### Basic Example

Create an access token for a user with default settings.

**Code (`src/example.ts`):**

```typescript
import { AccessTokenGenerator } from 'access-token-generator';

const generator = new AccessTokenGenerator({
  payloadOptions: {
    email: 'user@example.com',
    accountType: 'Admin',
    verified: true,
  },
  signingKey: 'your-secret-key',
});

const token = generator.getJWT({ expiredIn: '1h' });
console.log(token);
```

### Tenant-Based Permissions

Generate a token with tenant-specific roles and permissions.

**Code (`src/example-tenants.ts`):**

```typescript
import { AccessTokenGenerator } from 'auth-token-generator';

const generator = new AccessTokenGenerator({
  payloadOptions: {
    email: 'user@example.com',
    accountType: 'User',
    verified: true,
  },
  signingKey: 'your-secret-key',
  tenants: [
    { id: 'tenant1', role: 'Admin', permissions: ['read', 'write'] },
    { id: 'tenant2', role: 'Viewer', permissions: ['read'] },
  ],
});

const token = generator.getJWT({ expiredIn: '2h' });
console.log(token);
```

### Advanced Configuration

Use an asymmetric signing algorithm and configure additional options.

**Code (`src/example-advanced.ts`):**

```typescript
import { AccessTokenGenerator } from 'auth-token-generator';
import { readFileSync } from 'fs';

const privateKey = readFileSync('./private-key.pem');

const generator = new AccessTokenGenerator({
  payloadOptions: {
    email: 'user@example.com',
    accountType: 'User',
    verified: true,
  },
  signingKey: privateKey,
  algorithm: 'RS256',
  issuer: 'my-app',
});

const token = generator.getJWT({
  expiresAt: new Date(Date.now() + 3600 * 1000),
});
console.log(token);
```

---

## API Reference

### `AccessTokenGenerator`

The main class for generating JWTs.

#### Constructor

```typescript
new AccessTokenGenerator(params: {
  payloadOptions: TokenPayloadOptions;
  signingKey: string | Buffer | KeyObject;
  algorithm?: jwt.Algorithm;
  tenants?: TenantPermissions[];
  issuer?: string;
  type?: string;
});
```

- `payloadOptions`: Configuration for the user payload.
- `signingKey`: The key used to sign the token (string, buffer, or key object).
- `algorithm`: The signing algorithm (default: `'HS256'`).
- `tenants`: Optional tenant-specific roles and permissions.
- `issuer`: The token issuer (default: `'my-issuer'`).
- `type`: The token type (default: `'access'`).

#### Methods

##### `addTenant(tenant: TenantPermissions): this`

Adds a tenant to the token.

##### `removeTenant(tenantId: string): this`

Removes a tenant from the token.

##### `reset(): this`

Resets the tenant list to the original state.

##### `getJWT(opts: { expiresAt?: Date; expiredIn?: string }): string`

Generates a signed JWT.

- `expiresAt`: Absolute expiration time.
- `expiredIn`: Relative expiration time (e.g., `'15m'`).

---

## Interfaces

### `TokenPayloadOptions`

Defines the user payload options.

| Property      | Type       | Description                          | Default        |
| :------------ | :--------- | :----------------------------------- | :------------- |
| `email`       | `string`   | User's email address.                | **Required**   |
| `firstName`   | `string?`  | User's first name.                   | `undefined`    |
| `lastName`    | `string?`  | User's last name.                    | `undefined`    |
| `permissions` | `string[]` | User's permissions.                  | `[]`           |
| `id`          | `string?`  | User's unique ID.                    | `randomUUID()` |
| `createdAt`   | `string?`  | Account creation timestamp.          | `new Date()`   |
| `verified`    | `boolean?` | Whether the account is verified.     | `true`         |
| `accountType` | `string?`  | Type of account (e.g., Admin, User). | `'User'`       |
| `imageUrl`    | `string?`  | URL to the user's profile image.     | `undefined`    |
| `masterKey`   | `string?`  | Optional master key for the token.   | `undefined`    |

### `TenantPermissions`

Defines tenant-specific roles and permissions.

| Property      | Type       | Description                    |
| :------------ | :--------- | :----------------------------- |
| `id`          | `string`   | Tenant ID.                     |
| `role`        | `string`   | Role within the tenant.        |
| `permissions` | `string[]` | Permissions within the tenant. |

---

## Troubleshooting

### Buffer Key Warning

If you use a `Buffer` key with the default `'HS256'` algorithm, you may see a warning:

> Warning: Using a Buffer key with the default 'HS256' algorithm. Consider specifying an asymmetric algorithm like 'RS256'.

_Solution_: Use an asymmetric algorithm (e.g., `'RS256'`) for better security.

---

## Contributing

If you have suggestions for how this project could be improved, or want to report a bug, open an issue! Contributions are welcome.

---

## License

[MIT](LICENSE) © 2025 Your Name
