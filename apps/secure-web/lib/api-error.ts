// Normalises the Nest API's error bodies for display:
//   { message: string }                                   — HttpException
//   { message: 'Validation failed', errors: [{ path, message }] } — nestjs-zod
//   { message: 'ThrottlerException: Too Many Requests' }   — per-IP rate limit
export type ApiError = {
  status: number;
  // Safe to show the user; null when the API's text is internal.
  message: string | null;
  // First message per top-level request field, e.g. { phoneNumber: '…' }.
  fieldErrors: Record<string, string>;
};

export async function readApiError(res: Response): Promise<ApiError> {
  const data: unknown = await res.json().catch(() => null);
  const body = (data ?? {}) as { message?: unknown; errors?: unknown };

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(body.errors)) {
    for (const issue of body.errors as { path?: unknown; message?: unknown }[]) {
      const field = Array.isArray(issue.path) ? issue.path[0] : undefined;
      if (typeof field === 'string' && typeof issue.message === 'string' && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
  }

  const raw = typeof body.message === 'string' ? body.message : null;
  const message = raw && !raw.startsWith('ThrottlerException') ? raw : null;

  return { status: res.status, message, fieldErrors };
}

export const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again.';
export const GENERIC_ERROR = 'Something went wrong. Please try again.';
export const RATE_LIMIT_ERROR = 'Too many attempts. Please wait a minute and try again.';
