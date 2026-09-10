declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    JWT_SECRET: string;
    APP_BASE_URL: string;
    CORS_ORIGIN?: string;
    TEST_MIGRATIONS?: D1Migration[];
  }
}
