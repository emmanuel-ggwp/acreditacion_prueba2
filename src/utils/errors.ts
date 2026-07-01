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
  constructor(message = 'Error de autenticación') {
    super(message, 401);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'La validación falló', errors: Record<string, string[]> = {}) {
    super(message, 422);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export class ServerError extends AppError {
  constructor(message = 'Ocurrió un error interno del servidor') {
    super(message, 500);
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Ocurrió un error de red. Por favor, verifica tu conexión.') {
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
      message: data.message || 'Ocurrió un error en la API',
      details: data.errors,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Ocurrió un error desconocido' };
};
