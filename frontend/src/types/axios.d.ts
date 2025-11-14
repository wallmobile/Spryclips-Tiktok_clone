import 'axios';

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface AxiosError<T = any, D = any> {
    userMessage?: string;
    errorCode?: string;
    requestId?: string;
    details?: unknown;
    retryable?: boolean;
    isNetworkError?: boolean;
  }
}


