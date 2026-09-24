import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Second CSRF layer behind SameSite=Strict cookies (and a fallback for old
// browsers that ignore SameSite). Browsers always attach Origin to
// cross-origin state-changing requests, so a forged POST from another site
// carries that site's Origin and is rejected here before any handler runs.
//
// Requests with neither Origin nor Referer are allowed: those are
// non-browser clients (curl, server-to-server), which don't hold a
// victim's cookies and so can't perform CSRF.
export function csrfOriginMiddleware(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins.map((origin) => origin.toLowerCase()));

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const source = req.get('origin') ?? originOfReferer(req.get('referer'));
    if (source === undefined || allowed.has(source.toLowerCase())) {
      return next();
    }

    res.status(403).json({
      statusCode: 403,
      message: 'Cross-origin request blocked',
    });
  };
}

function originOfReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    // Unparseable Referer on a state-changing request — treat as foreign.
    return 'null';
  }
}
