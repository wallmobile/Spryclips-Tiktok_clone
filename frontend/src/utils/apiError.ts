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
  NETWORK_ERROR: 'We couldn’t reach the server. Please check your connection.',
  HTTP_400: 'Invalid request.',
  HTTP_401: 'Your session has ended. Please log in.',
  HTTP_403: 'You do not have permission.',
  HTTP_404: 'Item not found.',
  HTTP_408: 'Request timed out.',
  HTTP_409: 'Conflict error.',
  HTTP_422: 'Validation failed.',
  HTTP_429: 'Too many requests. Try again later.',
  HTTP_500: 'Server error. Try again.',
  HTTP_503: 'Service unavailable. Try later.'
};

const statusToCode = (status?: number): string =>
  status ? `HTTP_${status}` : 'NETWORK_ERROR';

const safeString = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

const toRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const extractBackendCode = (data: Record<string, unknown>): string | undefined =>
  safeString(data.errorCode) ||
  safeString(data.code) ||
  safeString(data.error) ||
  safeString(data.type);

const computeMessage = (
  error: AxiosError,
  status?: number,
  data?: Record<string, unknown>
): string => {
  const msg = safeString(data?.userMessage) || safeString(data?.message);
  if (msg && status && status < 500) return msg;

  if (!error.response) return DEFAULT_MESSAGES.NETWORK_ERROR;

  const code = statusToCode(status);
  return DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.HTTP_400;
};

export const normalizeAxiosError = (error: AxiosError): NormalizedApiError => {
  const status =
    error.response?.status ?? (error.code === 'ECONNABORTED' ? 408 : undefined);

  const data = toRecord(error.response?.data);
  const isNetwork = !error.response;

  const errorCode = extractBackendCode(data) || statusToCode(status);
  const userMessage = computeMessage(error, status, data);

  const requestId =
    safeString(data.requestId) ||
    error.response?.headers?.['x-request-id'] ||
    error.response?.headers?.['x-requestid'];

  return {
    status,
    errorCode,
    userMessage,
    requestId,
    details: data.details,
    isNetworkError: isNetwork,
    retryable: isNetwork || (status ? status >= 500 || status === 408 : false)
  };
};

export const subscribeToApiErrors = (listener: ApiErrorListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitApiError = (event: ApiErrorEvent): void => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('Error in API error listener', err);
    }
  });
};

export const hasBeenBroadcast = (error: AxiosError): boolean =>
  Boolean((error as any).__broadcasted);

export const isAxiosError = (error: unknown): error is AxiosError =>
  typeof error === 'object' &&
  error !== null &&
  'isAxiosError' in (error as any);

export const broadcastAxiosError = (error: AxiosError) => {
  (error as any).__broadcasted = true;

  const normalized = normalizeAxiosError(error);
  const event: ApiErrorEvent = {
    id: crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    rawError: error,
    ...normalized
  };

  emitApiError(event);
  return normalized;
};

export const clearApiErrorListeners = () => {
  listeners.clear();
};
