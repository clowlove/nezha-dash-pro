import { NextRequest, NextResponse } from 'next/server';

// API endpoint mappings - v1 routes to existing endpoints
const ENDPOINT_MAP: Record<string, string> = {
  '/api/v1/servers': '/api/servers',
  '/api/v1/alerts': '/api/alerts',
  '/api/v1/alerts/rules': '/api/alerts/rules',
  '/api/v1/notifications': '/api/notifications',
  '/api/v1/notifications/logs': '/api/notifications/logs',
  '/api/v1/billing': '/api/billing',
  '/api/v1/billing/plans': '/api/billing/plans',
  '/api/v1/billing/subscription': '/api/billing/subscription',
  '/api/v1/billing/invoices': '/api/billing/invoices',
  '/api/v1/billing/usage': '/api/billing/usage',
  '/api/v1/deploy': '/api/deploy',
  '/api/v1/webhooks': '/api/webhooks',
  '/api/v1/health': '/api/health',
  '/api/v1/system': '/api/system',
};

// API key validation
async function validateApiKey(req: NextRequest): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');

  let key = apiKey;

  // Support Bearer token as well
  if (!key && authHeader?.startsWith('Bearer ')) {
    key = authHeader.slice(7);
  }

  if (!key) {
    return { valid: false, error: 'API key is required. Provide via X-API-Key header or Authorization: Bearer token.' };
  }

  // Validate against your API key storage
  // This is a simplified example - implement proper validation
  try {
    // In production, check against database
    // const apiKeyRecord = await db.apiKeys.findByKey(key);
    // if (!apiKeyRecord || !apiKeyRecord.active) {
    //   return { valid: false, error: 'Invalid or inactive API key' };
    // }
    // return { valid: true, userId: apiKeyRecord.userId };

    // For now, accept any non-empty key (replace with real validation)
    if (key.length < 10) {
      return { valid: false, error: 'Invalid API key format' };
    }

    return { valid: true, userId: 'api-user' };
  } catch (err) {
    return { valid: false, error: 'API key validation failed' };
  }
}

// Rate limiting (simplified - use Redis in production)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit = 1000, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimits.get(userId);

  if (!record || now > record.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Resolve the target internal URL
function resolveTargetUrl(req: NextRequest, path: string[]): string {
  const basePath = `/api/v1/${path.join('/')}`;

  // Try exact match first
  if (ENDPOINT_MAP[basePath]) {
    return ENDPOINT_MAP[basePath];
  }

  // Try prefix matching for dynamic routes
  for (const [v1Path, internalPath] of Object.entries(ENDPOINT_MAP)) {
    if (basePath.startsWith(v1Path + '/')) {
      const suffix = basePath.slice(v1Path.length);
      return `${internalPath}${suffix}`;
    }
  }

  // Default: strip /v1 prefix
  return `/api/${path.join('/')}`;
}

// Main route handler - catches all methods
async function handleRequest(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const startTime = Date.now();

  // Validate API key
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error, code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  // Rate limiting
  if (!checkRateLimit(auth.userId!)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  // Resolve target
  const targetPath = resolveTargetUrl(req, params.path);
  const targetUrl = new URL(targetPath, req.url);

  // Copy query parameters
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Build headers for internal request
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Skip host and connection headers
    if (!['host', 'connection', 'x-forwarded-for', 'x-real-ip'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Add user context headers
  headers.set('X-API-User-ID', auth.userId!);
  headers.set('X-API-Version', 'v1');

  try {
    // Forward request to internal API
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Build response
    const responseBody = await response.text();
    const responseHeaders = new Headers();

    response.headers.forEach((value, key) => {
      // Copy relevant headers
      if (
        key.toLowerCase().startsWith('content-') ||
        key.toLowerCase().startsWith('x-') ||
        ['etag', 'cache-control', 'vary'].includes(key.toLowerCase())
      ) {
        responseHeaders.set(key, value);
      }
    });

    // Add API version headers
    responseHeaders.set('X-API-Version', 'v1');
    responseHeaders.set('X-Response-Time', `${Date.now() - startTime}ms`);
    responseHeaders.set('Content-Type', 'application/json');

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[API v1] Error proxying to ${targetPath}:`, err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// Export handlers for all HTTP methods
export async function GET(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}
