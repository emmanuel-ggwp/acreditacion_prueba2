/**
 * Errores de aplicación tipados y su normalización para la UI.
 *
 * Expone clases de error con `statusCode` HTTP asociado ({@link AuthenticationError},
 * {@link ValidationError}, {@link NotFoundError}, {@link ServerError},
 * {@link NetworkError}) y un normalizador ({@link errorHandler}) que convierte cualquier
 * error (propio, de axios o genérico) en `{ message, details? }` para mostrar.
 */
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

/** Error de autenticación (statusCode 401). */
export class AuthenticationError extends AppError {
  constructor(message = 'Error de autenticación') {
    super(message, 401);
  }
}

/**
 * Error de validación (statusCode 422).
 * Lleva `errors`: mapa de campo -> lista de mensajes de validación.
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'La validación falló', errors: Record<string, string[]> = {}) {
    super(message, 422);
    this.errors = errors;
  }
}

/** Error de recurso no encontrado (statusCode 404). */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

/** Error interno del servidor (statusCode 500). */
export class ServerError extends AppError {
  constructor(message = 'Ocurrió un error interno del servidor') {
    super(message, 500);
  }
}

/** Error de red / servicio no disponible (statusCode 503). */
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
