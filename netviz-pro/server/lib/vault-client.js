/**
 * Vault Client for NetViz Pro (OSPF-LL-JSON-PART1)
 * Fetches secrets from HashiCorp Vault using AppRole authentication
 */

import https from 'https';
import http from 'http';

class VaultClient {
  constructor(config) {
    this.address = config.address || 'http://localhost:9121';
    this.token = config.token || null;
    this.roleId = config.roleId;
    this.secretId = config.secretId;
    this.tokenExpiry = 0;
  }

  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.address);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.token) {
        options.headers['X-Vault-Token'] = this.token;
      }

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = data ? JSON.parse(data) : {};
              resolve(parsed);
            } else {
              const error = data ? JSON.parse(data) : { errors: ['Unknown error'] };
              reject(new Error(`Vault error: ${error.errors?.join(', ') || 'Unknown'}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Vault response: ${data}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`Vault connection error: ${e.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  async authenticate() {
    if (!this.roleId || !this.secretId) {
      throw new Error('AppRole credentials not configured');
    }

    const response = await this.request('POST', '/v1/auth/approle/login', {
      role_id: this.roleId,
      secret_id: this.secretId,
    });

    this.token = response.auth.client_token;
    this.tokenExpiry = Date.now() + response.auth.lease_duration * 1000 * 0.75;

    console.log('[Vault] Authenticated successfully');
  }

  async ensureAuthenticated() {
    if (!this.token || Date.now() > this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async getSecret(path) {
    await this.ensureAuthenticated();

    const response = await this.request(
      'GET',
      `/v1/ospf-ll-json-part1/data/${path}`
    );

    return response.data.data;
  }

  async getConfig() {
    const secret = await this.getSecret('config');
    return {
      jwt_secret: secret.jwt_secret,
      session_secret: secret.session_secret,
      jwt_expires_in: secret.jwt_expires_in || '3600',
      environment: secret.environment || 'production',
    };
  }

  async isAvailable() {
    try {
      await this.request('GET', '/v1/sys/health');
      return true;
    } catch {
      return false;
    }
  }
}

let vaultClient = null;

export function initVaultClient() {
  if (!vaultClient) {
    vaultClient = new VaultClient({
      address: process.env.VAULT_ADDR || 'http://localhost:9121',
      roleId: process.env.VAULT_ROLE_ID,
      secretId: process.env.VAULT_SECRET_ID,
      token: process.env.VAULT_TOKEN,
    });
  }
  return vaultClient;
}

export function getVaultClient() {
  if (!vaultClient) {
    throw new Error('Vault client not initialized. Call initVaultClient() first.');
  }
  return vaultClient;
}

export { VaultClient };
