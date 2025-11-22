import type { AxiosError } from 'axios';

export interface NormalizedApiError {
  status?: number;
  errorCode: string;
  userMessage: string;
  requestId?: string;
  details?: unknown;
  isNetworkError: boolean;
  retryable: boolean;
}

export interface ApiErrorEvent extends NormalizedApiError {
  id: string;
  timestamp: number;
  rawError: unknown;
}

type ApiErrorListener = (event: ApiErrorEvent) => void;

const listeners = new Set<ApiErrorListener>();

const DEFAULT_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'We couldn’t reach the server. Please check your connection and try again.',
  HTTP_400: 'We could not process your request. Please review the information and try again.',
  HTTP_401: 'Your session has ended. Please sign in again.',
  HTTP_403: 'You do not have permission to complete this action.',
  HTTP_404: 'We could not find what you were looking for.',
  HTTP_408: 'The request took too long. Please try again.',
  HTTP_409: 'This action could not be completed because of a conflict.',
  HTTP_422: 'Some of the information provided is invalid. Please review and try again.',
  HTTP_429: 'Too many requests. Please wait a moment and try again.',
  HTTP_500: 'Something went wrong on our side. Please try again in a moment.',
  HTTP_503: 'The service is temporarily unavailable. Please try again later.'
};

const httpStatusToCode = (status?: number): string => {
  if (!status) {
    return 'NETWORK_ERROR';
  }
  return `HTTP_${status}`;
};

const getDefaultMessage = (status?: number, fallback?: string): string => {
  const code = httpStatusToCode(status);
  if (fallback && fallback.trim().length > 0) {
    return fallback;
  }
  if (DEFAULT_MESSAGES[code]) {
    return DEFAULT_MESSAGES[code];
  }
  if (status && status >= 500) {
    return DEFAULT_MESSAGES.HTTP_500;
  }
  if (status && status >= 400) {
    return DEFAULT_MESSAGES.HTTP_400;
  }
  return 'We ran into an unexpected issue. Please try again.';
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

const safeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const getHeader = (error: AxiosError, name: string): string | undefined => {
  const headers = error.response?.headers;
  if (!headers) {
    return undefined;
  }
  const value = headers[name] ?? headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
};

const generateEventId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const extractBackendCode = (data: Record<string, unknown>): string | undefined => {
  return (
    safeString(data.errorCode) ||
    safeString(data.code) ||
    safeString(data.error) ||
    safeString(data.type)
  );
};

const extractDetails = (data: Record<string, unknown>): unknown => {
  if (data.details !== undefined) {
    return data.details;
  }
  if (data.errors !== undefined) {
    return data.errors;
  }
  if (data.validationErrors !== undefined) {
    return data.validationErrors;
  }
  return undefined;
};

const computeUserMessage = (
  axiosError: AxiosError,
  status?: number,
  data?: Record<string, unknown>
): string => {
  // First, check for explicit userMessage in the response data
  const userMessage = safeString(data?.userMessage);
  if (userMessage && userMessage.trim().length > 0) {
    return userMessage;
  }

  const backendMessage = safeString(data?.message);
  
  // Handle specific technical messages that should be user-friendly
  if (backendMessage && backendMessage.trim().length > 0) {
    const lowerMessage = backendMessage.toLowerCase();
    // Replace technical "refresh token" messages with user-friendly message
    if (lowerMessage.includes('refresh token required') || 
        lowerMessage.includes('refresh token') ||
        lowerMessage.includes('token required') ||
        (status === 401 && lowerMessage.includes('unauthorized'))) {
      return 'Please sign in to continue.';
    }
    // For 401 errors, prefer user-friendly default over technical message
    if (status === 401) {
      return DEFAULT_MESSAGES.HTTP_401;
    }
    // For other client errors (4xx), use the backend message if available
    if (status && status >= 400 && status < 500) {
      return backendMessage;
    }
  }

  if (!axiosError.response) {
    return DEFAULT_MESSAGES.NETWORK_ERROR;
  }

  return getDefaultMessage(status, backendMessage);
};

export const normalizeAxiosError = (error: AxiosError): NormalizedApiError => {
  const status = error.response?.status ?? (error.code === 'ECONNABORTED' ? 408 : undefined);
  const data = asRecord(error.response?.data);
  const isNetworkError = !error.response;

  const backendCode = extractBackendCode(data);
  const errorCode = backendCode || httpStatusToCode(status);
  const userMessage = computeUserMessage(error, status, data);

  const requestId =
    safeString(data.requestId) ||
    getHeader(error, 'x-request-id') ||
    getHeader(error, 'x-requestid');

  const details = extractDetails(data);
  const retryable = isNetworkError || (status ? status >= 500 || status === 408 : false);

  const normalized: NormalizedApiError = {
    status,
    errorCode,
    userMessage,
    requestId,
    details,
    isNetworkError,
    retryable
  };

  (error as AxiosError & {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }).userMessage = userMessage;

  (error as AxiosError & {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }).errorCode = errorCode;

  (error as AxiosError & {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }).requestId = requestId;

  (error as AxiosError & {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }).details = details;

  (error as AxiosError & {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }).retryable = retryable;

  (error as AxiosError & {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }).isNetworkError = isNetworkError;

  if (error.response) {
    error.response.data = {
      ...data,
      message: userMessage,
      userMessage,
      code: errorCode,
      errorCode,
      requestId,
      details
    };
  }

  if (data.retryable !== undefined) {
    normalized.retryable = toBoolean(data.retryable);
  }

  return normalized;
};

export const subscribeToApiErrors = (listener: ApiErrorListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitApiError = (event: ApiErrorEvent): void => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (listenerError) {
      // eslint-disable-next-line no-console
      console.error('Error in API error listener', listenerError);
    }
  });
};

export const broadcastAxiosError = (error: AxiosError): NormalizedApiError => {
  const normalized = normalizeAxiosError(error);
  const event: ApiErrorEvent = {
    id: generateEventId(),
    timestamp: Date.now(),
    rawError: error,
    ...normalized
  };
  (error as AxiosError & { __broadcasted?: boolean }).__broadcasted = true;
  emitApiError(event);
  return normalized;
};

export const clearApiErrorListeners = (): void => {
  listeners.clear();
};


