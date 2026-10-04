// Provider failures carry only curated messages across IPC, never remote bodies.
export class UsageError extends Error {
  constructor(code, message, retryAfterMs = null) {
    super(message);
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export function publicError(error) {
  return error instanceof UsageError
    ? { code: error.code, message: error.message, retryAfterMs: error.retryAfterMs }
    : { code: 'unavailable', message: 'Usage could not be retrieved. Try again.', retryAfterMs: null };
}
