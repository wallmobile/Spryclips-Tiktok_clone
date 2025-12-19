# OpenID Connect (OIDC) Provider Setup Guide

This project now acts as a Central Identity Provider (SSO) using OpenID Connect. Other internal and external applications can authenticate users using this project's user database.

## Architecture Overview

- **Library**: `oidc-provider` (OpenID Certified)
- **Issuer URL**: `https://sprylogin.com`
- **Discovery Endpoint**: `/.well-known/openid-configuration`
- **Database**: MongoDB (using a custom adapter in `backend/oidc/adapter.js`)
- **Signing Algorithm**: RS256 (Keys managed in `backend/oidc/jwks.json`)

## Endpoints (Customized)

- **Authorization**: `https://sprylogin.com/o/authorize`
- **Token**: `https://sprylogin.com/o/token`
- **User Info**: `https://sprylogin.com/o/userinfo`
- **JWKS**: `https://sprylogin.com/o/jwks`

## Directory Structure

- `backend/oidc/`: Core OIDC logic
  - `adapter.js`: MongoDB persistence for OIDC sessions/tokens.
  - `jwks.js`: RSA key management for token signing.
  - `provider.js`: OIDC engine configuration and claim mapping.
  - `interactions.js`: The "Bridge" between OIDC and the existing login system.
  - `index.js`: Initialization logic.

## How it Works (Interaction Flow)

1. **Request**: A Client Project redirects the user to `https://sprylogin.com/o/authorize`.
2. **Check Session**: The OIDC provider checks if the user has an active session in the main app (via `accessToken` cookie).
3. **Redirect to Login**: If no session exists, the user is redirected to the frontend login page: `http://localhost:3000/login?returnTo=...`.
4. **Login**: The user logs in normally. The frontend handles the `returnTo` parameter and redirects back to it after success.
5. **Grant**: Once back at the OIDC interaction URL, the provider issues the authorization code.

## Client Registration

The following client is registered for production and development:

- **Client ID**: `spryclips_oidc`
- **Client Secret**: `november_2025_spryclips`
- **Redirect URIs**: 
  - `https://spryclips.com/auth/callback`
  - `https://www.spryclips.com/auth/callback`
  - `http://localhost:3000/auth/callback`
  - `https://oauthdebugger.com/debug`
- **Grant Types**: `authorization_code`, `refresh_token`

## Integration Guide for Other Projects

### 1. Discovery
Other projects should use the discovery endpoint to get all necessary URLs:
`GET https://sprylogin.com/.well-known/openid-configuration`

### 2. Configuration
Use an OIDC client library (e.g., `openid-client` for Node.js, `next-auth` for Next.js) with the following:
- **Issuer**: `https://sprylogin.com`
- **Client ID**: `spryclips_oidc`
- **Client Secret**: `november_2025_spryclips`

### 3. Scopes & Claims
The provider supports the following scopes:
- `openid`: Returns `sub` (User ID).
- `email`: Returns `email` and `email_verified`.
- `profile`: Returns `preferred_username` and `name`.

## Security Best Practices

- **PKCE**: Supported and recommended for all clients.
- **JWKS**: Keys are stored in `backend/oidc/jwks.json`. In production, ensure this file is backed up and kept secure.
- **HTTPS**: Always use HTTPS in production for the issuer and redirect URIs.
