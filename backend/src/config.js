// Central config: the ONLY place that reads process.env.
// Every other file imports this frozen object. Validation fails fast at
// startup with a clear message instead of running misconfigured.
import 'dotenv/config';

function parseBool(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

function parseOrigins(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

// Pure + unit-testable: pass any env-like object, get config or a throw.
export function validateConfig(env = process.env) {
  const errors = [];
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const authSecret = env.AUTH_SECRET || '';
  if (!authSecret) {
    errors.push('AUTH_SECRET is missing. Generate one with: openssl rand -hex 32');
  } else if (authSecret.length < 32) {
    errors.push(`AUTH_SECRET must be 32+ chars (got ${authSecret.length}). Generate one with: openssl rand -hex 32`);
  }

  const databaseUrl = env.DATABASE_URL || '';
  if (isProd && !databaseUrl) {
    errors.push('DATABASE_URL is required in production. Refusing to boot into memory mode (data would be lost on restart).');
  }

  const allowDemoLogin = parseBool(env.ALLOW_DEMO_LOGIN, false);
  if (isProd && allowDemoLogin) {
    errors.push('ALLOW_DEMO_LOGIN=true is forbidden when NODE_ENV=production. Set it to false.');
  }

  const corsOrigins = parseOrigins(env.CORS_ORIGINS);
  if (isProd && corsOrigins.length === 0) {
    errors.push('CORS_ORIGINS is required in production (comma-separated frontend origin(s), e.g. https://your-app.pages.dev).');
  }

  const seedDemo = parseBool(env.SEED_DEMO, false);
  if (isProd && seedDemo) {
    errors.push('SEED_DEMO=true is forbidden when NODE_ENV=production. Seed demo data in staging/dev only.');
  }
  const seedDemoPassword = env.SEED_DEMO_PASSWORD || '';
  if (seedDemo && (!seedDemoPassword || seedDemoPassword.length < 8)) {
    errors.push('SEED_DEMO=true requires SEED_DEMO_PASSWORD (8+ chars) so seeded demo users can log in. Dev/staging only.');
  }

  const r2Configured = Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);
  if (!r2Configured) {
    // Delete-on-entry policy (owner decision 2026-10-03): receipt photos are
    // a temporary transcription aid, deleted on sale save, nothing retained.
    // So R2 is optional; without it uploads ride ephemeral local disk, which
    // is acceptable for a file that lives minutes. Warn loudly in prod.
    console.warn('R2 storage is not configured — receipt uploads use ephemeral local disk. Fine under delete-on-entry; do not retain photos there.');
  }

  if (errors.length) {
    throw new Error(`Invalid configuration:\n- ${errors.join('\n- ')}`);
  }

  const maxUploadMb = Number(env.MAX_UPLOAD_MB || 5);

  // Dropdown seeds for lookup_options. Env-owned (owners change these without
  // code edits); the fallbacks below only apply when env is unset, and every
  // value stays manageable per-business via More > Lists.
  function parseList(raw, fallback) {
    const items = String(raw == null || raw === '' ? fallback : raw)
      .split(',')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    return [...new Set(items)];
  }
  const defaultUnits = parseList(env.DEFAULT_UNITS, 'piece,kg,g,litre,ml,pack,bag,carton,crate,bottle,tin,dozen');
  const defaultEditReasons = parseList(env.DEFAULT_EDIT_REASONS, 'Miscounted,Wrong product,Wrong price,Duplicate entry,Customer return,Other');

  const config = {
    nodeEnv,
    isProd,
    port: Number(env.PORT || 4000),
    databaseUrl: databaseUrl || null,
    // Migrations / admin scripts use the direct URL; the app uses the pooled URL.
    databaseUrlUnpooled: env.DATABASE_URL_UNPOOLED || databaseUrl || null,
    dbPoolMax: Number(env.DB_POOL_MAX || 10),
    authSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
    corsOrigins,
    defaultCurrency: env.DEFAULT_CURRENCY || 'USD',
    defaultTimezone: env.DEFAULT_TIMEZONE || 'UTC',
    defaultUnits,
    defaultEditReasons,
    seedDemo,
    seedDemoPassword: seedDemoPassword || null,
    allowDemoLogin,
    maxUploadMb: Number.isFinite(maxUploadMb) && maxUploadMb > 0 ? maxUploadMb : 5,
    jsonBodyLimit: env.JSON_BODY_LIMIT || '1mb',
    bootstrap: {
      businessName: env.BOOTSTRAP_BUSINESS_NAME || null,
      ownerName: env.BOOTSTRAP_OWNER_NAME || null,
      ownerEmail: env.BOOTSTRAP_OWNER_EMAIL || null,
      ownerPassword: env.BOOTSTRAP_OWNER_PASSWORD || null,
    },
    r2: {
      accountId: env.R2_ACCOUNT_ID || null,
      accessKeyId: env.R2_ACCESS_KEY_ID || null,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || null,
      bucket: env.R2_BUCKET || null,
      publicBaseUrl: (env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '') || null,
      configured: r2Configured,
    },
  };
  return Object.freeze({ ...config, bootstrap: Object.freeze({ ...config.bootstrap }), r2: Object.freeze({ ...config.r2 }) });
}

const config = validateConfig(process.env);
export default config;
