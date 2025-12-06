/**
 * Keycloak JWT Token Verifier for NetViz Pro
 * Validates tokens issued by Keycloak using JWKS
 */

import jwt from 'jsonwebtoken';
import https from 'https';
import http from 'http';

class KeycloakVerifier {
  constructor(config) {
    this.serverUrl = (config.serverUrl || 'http://localhost:9120').replace(/\/$/, '');
    this.realm = config.realm || 'ospf-ll-json-part1';
    this.clientId = config.clientId || 'll-json-api';
    this.jwksCache = new Map();
    this.jwksCacheExpiry = 0;
    this.jwksCacheDuration = 10 * 60 * 1000; // 10 minutes
  }

  getJwksUri() {
    return `${this.serverUrl}/realms/${this.realm}/protocol/openid-connect/certs`;
  }

  getIssuer() {
    return `${this.serverUrl}/realms/${this.realm}`;
  }

  async fetchJwks() {
    const url = new URL(this.getJwksUri());
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
      };

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const jwks = JSON.parse(data);
              this.jwksCache.clear();

              for (const key of jwks.keys) {
                if (key.use === 'sig' && key.kty === 'RSA') {
                  const pem = this.jwkToPem(key);
                  this.jwksCache.set(key.kid, pem);
                }
              }

              this.jwksCacheExpiry = Date.now() + this.jwksCacheDuration;
              resolve();
            } else {
              reject(new Error(`Failed to fetch JWKS: HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse JWKS: ${e}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`JWKS fetch error: ${e.message}`));
      });

      req.end();
    });
  }

  jwkToPem(jwk) {
    const n = Buffer.from(jwk.n.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const e = Buffer.from(jwk.e.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const header = Buffer.from([0x30, 0x82]);
    const algIdentifier = Buffer.from([
      0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
      0x01, 0x05, 0x00,
    ]);

    const nInt = this.encodeInteger(n);
    const eInt = this.encodeInteger(e);

    const pubKeySeq = Buffer.concat([
      Buffer.from([0x30]),
      this.encodeLength(nInt.length + eInt.length),
      nInt,
      eInt,
    ]);

    const bitString = Buffer.concat([
      Buffer.from([0x03]),
      this.encodeLength(pubKeySeq.length + 1),
      Buffer.from([0x00]),
      pubKeySeq,
    ]);

    const fullSeq = Buffer.concat([algIdentifier, bitString]);

    const der = Buffer.concat([
      header,
      this.encodeLength(fullSeq.length).slice(0, 2),
      fullSeq,
    ]);

    const base64 = der.toString('base64');
    const lines = base64.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  encodeLength(length) {
    if (length < 128) {
      return Buffer.from([length]);
    } else if (length < 256) {
      return Buffer.from([0x81, length]);
    } else {
      return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
    }
  }

  encodeInteger(value) {
    const needsPadding = value[0] & 0x80;
    const paddedValue = needsPadding
      ? Buffer.concat([Buffer.from([0x00]), value])
      : value;

    return Buffer.concat([
      Buffer.from([0x02]),
      this.encodeLength(paddedValue.length),
      paddedValue,
    ]);
  }

  async getPublicKey(kid) {
    if (Date.now() > this.jwksCacheExpiry || !this.jwksCache.has(kid)) {
      await this.fetchJwks();
    }

    const key = this.jwksCache.get(kid);
    if (!key) {
      throw new Error(`Key ${kid} not found in JWKS`);
    }

    return key;
  }

  async verifyToken(token) {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    const kid = decoded.header.kid;
    if (!kid) {
      throw new Error('Token missing key ID (kid)');
    }

    const publicKey = await this.getPublicKey(kid);

    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: this.getIssuer(),
    });

    const realmRoles = payload.realm_access?.roles || [];
    const clientRoles = payload.resource_access?.[this.clientId]?.roles || [];

    let appRole = 'user';
    if (realmRoles.includes('admin') || clientRoles.includes('admin')) {
      appRole = 'admin';
    } else if (realmRoles.includes('viewer') || clientRoles.includes('viewer')) {
      appRole = 'viewer';
    }

    return {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: [appRole],
      realmRoles,
      clientRoles,
    };
  }

  async isAvailable() {
    try {
      await this.fetchJwks();
      return true;
    } catch {
      return false;
    }
  }
}

let keycloakVerifier = null;

export function initKeycloakVerifier() {
  if (!keycloakVerifier) {
    keycloakVerifier = new KeycloakVerifier({
      serverUrl: process.env.KEYCLOAK_URL || 'http://localhost:9120',
      realm: process.env.KEYCLOAK_REALM || 'ospf-ll-json-part1',
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'll-json-api',
    });
  }
  return keycloakVerifier;
}

export function getKeycloakVerifier() {
  if (!keycloakVerifier) {
    throw new Error('Keycloak verifier not initialized');
  }
  return keycloakVerifier;
}

export { KeycloakVerifier };
