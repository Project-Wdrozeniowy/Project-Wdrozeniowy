export interface ErrorResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

export interface GatewayConfig {
  spa: { enabled: boolean; directory: string };
  port: number;
  backendUrl: string;
  production: boolean;
  trustedProxies: string[];
  cors: { origins: string[] };
  rateLimit: { windowMs: number; max: number; loginMax: number; csrfMax: number };
  http: { maxBodyBytes: number; upstreamTimeoutMs: number; bodyTimeoutMs: number };
}
