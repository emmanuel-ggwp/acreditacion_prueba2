// Base class for custom application errors
class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 422);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A conflict occurred') {
    super(message, 409);
  }
}

export class ServerError extends AppError {
  constructor(message = 'An internal server error occurred') {
    super(message, 500);
  }
}

export class NetworkError extends AppError {
  constructor(message = 'A network error occurred. Please check your connection.') {
    super(message, 503); // Service Unavailable is a reasonable code
  }
}

/**
 * Normalizes errors for UI consumption.
 * It can take any error type and returns a structured error object.
 * @param error The error to handle.
 * @returns A structured error with a message and optional details.
 */
export const errorHandler = (error: any): { message: string; details?: any } => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      details: error instanceof ValidationError ? error.errors : undefined,
    };
  }

  if (error.response) {
    // Handle errors from axios or similar HTTP clients
    const { data } = error.response;
    return {
      message: data.message || 'An API error occurred',
      details: data.errors,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unknown error occurred' };
};
