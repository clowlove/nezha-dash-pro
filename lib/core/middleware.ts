// Composable middleware pipeline for API routes
// Rate limiting, CORS, compression, request logging, error boundary, auth chain

import { NextRequest, NextResponse } from 'next/server';
import { getEventBus } from './event-bus';
import { getLogger } from './logger';

// ── Types ─────────────────────────────────────────────────────────────────

export interface MiddlewareContext {
  req: NextRequest;
  params?: Record<string, string>;
  startTime: number;
  requestId: string;
  metadata: Map<string, unknown>;
  response?: NextResponse;
}

export type MiddlewareFn = (
  ctx: MiddlewareContext,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// ── Pipeline builder ──────────────────────────────────────────────────────

export class MiddlewarePipeline {
  private middlewares: MiddlewareFn[] = [];

  use(fn: MiddlewareFn): this {
    this.middlewares.push(fn);
    return this;
  }

  async execute(req: NextRequest, params?: Record<string, string>): Promise<NextResponse> {
    const ctx: MiddlewareContext = {
      req,
      params,
      startTime: Date.now(),
      requestId: crypto.randomUUID(),
      metadata: new Map(),
    };

    let idx = 0;
    const next = async (): Promise<NextResponse> => {
      if (idx >= this.middlewares.length) {
        return new NextResponse('Not Found', { status: 404 });
      }
      const mw = this.middlewares[idx++];
      return mw(ctx, next);
    };

    try {
      return await next();
    } catch (err) {
      return errorBoundaryHandler(err, ctx);
    }
  }
}

// ── Built-in middlewares ──────────────────────────────────────────────────

/** Request logging middleware */
export function requestLogger(): MiddlewareFn {
  return async (ctx, next) => {
    const logger = getLogger('http');
    const { method, url } = ctx.req;

    logger.info('request.start', {
      requestId: ctx.requestId,
      method,
      url,
      userAgent: ctx.req.headers.get('user-agent')?.slice(0, 100),
    });

    const response = await next();

    const duration = Date.now() - ctx.startTime;
    logger.info('request.end', {
      requestId: ctx.requestId,
      method,
      url,
      status: response.status,
      duration,
    });

    response.headers.set('X-Request-Id', ctx.requestId);
    response.headers.set('X-Response-Time', `${duration}ms`);
    return response;
  };
}

/** Error boundary middleware */
function errorBoundaryHandler(err: unknown, ctx: MiddlewareContext): NextResponse {
  const logger = getLogger('error');
  const error = err instanceof Error ? err : new Error(String(err));

  logger.error('unhandled.error', {
    requestId: ctx.requestId,
    message: error.message,
    stack: error.stack,
  });

  getEventBus().emit('middleware:error', { error, request: ctx.requestId });

  return NextResponse.json(
    { error: 'Internal Server Error', requestId: ctx.requestId },
    { status: 500 },
  );
}

/** Error boundary as composable middleware */
export function errorBoundary(): MiddlewareFn {
  return async (ctx, next) => {
    try {
      return await next();
    } catch (err) {
      return errorBoundaryHandler(err, ctx);
    }
  };
}

/** CORS middleware */
export function cors(opts?: {
  origins?: string[];
  methods?: HttpMethod[];
  headers?: string[];
  credentials?: boolean;
  maxAge?: number;
}): MiddlewareFn {
  const config = {
    origins: opts?.origins ?? ['*'],
    methods: opts?.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: opts?.headers ?? ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: opts?.credentials ?? false,
    maxAge: opts?.maxAge ?? 86400,
  };

  return async (ctx, next) => {
    const origin = ctx.req.headers.get('origin') ?? '*';
    const allowed = config.origins.includes('*') || config.origins.includes(origin);

    // Handle preflight
    if (ctx.req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: buildCorsHeaders(origin, allowed, config),
      });
    }

    const response = await next();
    const headers = buildCorsHeaders(origin, allowed, config);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  };
}

function buildCorsHeaders(
  origin: string,
  allowed: boolean,
  config: { methods: HttpMethod[]; headers: string[]; credentials: boolean; maxAge: number },
): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '',
    'Access-Control-Allow-Methods': config.methods.join(', '),
    'Access-Control-Allow-Headers': config.headers.join(', '),
    'Access-Control-Allow-Credentials': String(config.credentials),
    'Access-Control-Max-Age': String(config.maxAge),
  };
}

/** Rate limiting middleware (in-memory, per-IP) */
export function rateLimit(opts?: {
  windowMs?: number;
  max?: number;
  keyFn?: (req: NextRequest) => string;
  message?: string;
}): MiddlewareFn {
  const windowMs = opts?.windowMs ?? 60_000;
  const max = opts?.max ?? 100;
  const keyFn = opts?.keyFn ?? ((req) => req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anonymous');
  const message = opts?.message ?? 'Too Many Requests';

  const buckets = new Map<string, { count: number; resetAt: number }>();

  // Periodic cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);

  return async (ctx, next) => {
    const key = keyFn(ctx.req);
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count++;

    const remaining = Math.max(0, max - bucket.count);
    const response = bucket.count > max
      ? NextResponse.json({ error: message }, { status: 429 })
      : await next();

    response.headers.set('X-RateLimit-Limit', String(max));
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    return response;
  };
}

/** Response compression middleware (sets headers, actual compression handled by Next.js) */
export function compression(opts?: { threshold?: number }): MiddlewareFn {
  const threshold = opts?.threshold ?? 1024;

  return async (ctx, next) => {
    const response = await next();

    const accept = ctx.req.headers.get('accept-encoding') ?? '';
    const contentType = response.headers.get('content-type') ?? '';

    // Only compress text-based content
    if (
      (accept.includes('br') || accept.includes('gzip') || accept.includes('deflate')) &&
      (contentType.includes('text/') || contentType.includes('application/json') || contentType.includes('application/javascript'))
    ) {
      response.headers.set('Vary', 'Accept-Encoding');
      // Note: actual body compression should be done by Next.js/infra layer
      // This middleware ensures proper headers are set
    }

    return response;
  };
}

/** Auth chain middleware — validates JWT/session */
export function authChain(opts?: {
  publicPaths?: string[];
  authFn?: (req: NextRequest) => Promise<{ authenticated: boolean; userId?: string; role?: string }>;
}): MiddlewareFn {
  const publicPaths = opts?.publicPaths ?? ['/api/health', '/api/auth'];
  const authFn = opts?.authFn;

  return async (ctx, next) => {
    const pathname = ctx.req.nextUrl.pathname;

    // Skip auth for public paths
    if (publicPaths.some((p) => pathname.startsWith(p))) {
      return next();
    }

    if (!authFn) {
      // No auth function configured — pass through
      return next();
    }

    try {
      const result = await authFn(ctx.req);
      if (!result.authenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      ctx.metadata.set('userId', result.userId);
      ctx.metadata.set('role', result.role);
    } catch {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    return next();
  };
}

/** Request size limit middleware */
export function bodyLimit(maxBytes: number): MiddlewareFn {
  return async (ctx, next) => {
    const contentLength = ctx.req.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength) > maxBytes) {
      return NextResponse.json(
        { error: `Request body too large (max ${maxBytes} bytes)` },
        { status: 413 },
      );
    }
    return next();
  };
}

// ── Convenience: default API pipeline ─────────────────────────────────────

export function defaultPipeline(): MiddlewarePipeline {
  return new MiddlewarePipeline()
    .use(errorBoundary())
    .use(requestLogger())
    .use(cors())
    .use(rateLimit())
    .use(compression());
}
