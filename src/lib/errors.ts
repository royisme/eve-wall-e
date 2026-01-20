import { toast } from "@/lib/toast";

// Error codes for API responses
export const ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  NOT_FOUND: "NOT_FOUND",
  SERVER_ERROR: "SERVER_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Custom API Error class
export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR: "Connection failed. Please check if Eve is running.",
  VALIDATION_ERROR: "Invalid request data.",
  AUTH_ERROR: "Authentication required.",
  NOT_FOUND: "Resource not found.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNKNOWN_ERROR: "An unexpected error occurred.",
};

// Parse error from various sources
export function parseError(error: unknown): ApiError {
  // Already an ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Network/fetch errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new ApiError(
      ERROR_MESSAGES.NETWORK_ERROR,
      ERROR_CODES.NETWORK_ERROR,
      0
    );
  }

  // Response-based errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Parse status from message if available
    const statusMatch = error.message.match(/(\d{3})/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 500;

    if (status === 400 || message.includes("validation")) {
      return new ApiError(
        ERROR_MESSAGES.VALIDATION_ERROR,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    if (status === 401 || status === 403 || message.includes("auth")) {
      return new ApiError(
        ERROR_MESSAGES.AUTH_ERROR,
        ERROR_CODES.AUTH_ERROR,
        status
      );
    }

    if (status === 404 || message.includes("not found")) {
      return new ApiError(
        ERROR_MESSAGES.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        404
      );
    }

    if (status >= 500) {
      return new ApiError(
        ERROR_MESSAGES.SERVER_ERROR,
        ERROR_CODES.SERVER_ERROR,
        status
      );
    }

    return new ApiError(
      error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
      ERROR_CODES.UNKNOWN_ERROR,
      status
    );
  }

  // Fallback for unknown error types
  return new ApiError(
    ERROR_MESSAGES.UNKNOWN_ERROR,
    ERROR_CODES.UNKNOWN_ERROR,
    500
  );
}

// Handle API errors with toast notifications
export function handleApiError(error: unknown): string {
  const apiError = parseError(error);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error("[API Error]", {
      code: apiError.code,
      status: apiError.status,
      message: apiError.message,
      details: apiError.details,
      stack: apiError.stack,
    });
  }

  // Show toast notification
  toast("error", apiError.message);

  return apiError.message;
}

// Check if error is a network/offline error
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.code === ERROR_CODES.NETWORK_ERROR;
  }
  if (error instanceof TypeError) {
    return error.message.includes("fetch") || error.message.includes("network");
  }
  return false;
}

// Get user-friendly message for an error code
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
