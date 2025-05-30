export class GrowiApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'GrowiApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const isGrowiApiError = (error: unknown): error is GrowiApiError => {
  if (error instanceof GrowiApiError) {
    return true;
  }

  if (error instanceof Error) {
    return error.name === 'GrowiApiError';
  }

  return false;
};
