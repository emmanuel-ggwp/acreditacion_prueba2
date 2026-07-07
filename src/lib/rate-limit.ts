import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextRequest, NextResponse } from 'next/server';

const rateLimiter = new RateLimiterMemory({
  points: 1000, // 10 requests
  duration: 6, // per 60 seconds by IP
});

export async function rateLimitMiddleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  try {
    await rateLimiter.consume(ip);
    return null;
  } catch (e) {
    return new NextResponse('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil(((e as any).msBeforeNext ?? 1000) / 1000)),
      },
    });
  }
}

