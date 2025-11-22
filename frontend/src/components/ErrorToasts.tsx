import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiErrorEvent, subscribeToApiErrors } from '../utils/apiError';
import './ErrorToasts.css';

const AUTO_DISMISS_MS = 6000;

interface ErrorToastState extends ApiErrorEvent {
  visible: boolean;
}

const ErrorToasts: React.FC = () => {
  const [toasts, setToasts] = useState<ErrorToastState[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const timers = timersRef.current;
    const timeoutId = timers.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timers.delete(id);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [clearTimer]);

  const scheduleRemoval = useCallback((id: string) => {
    clearTimer(id);
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timersRef.current.delete(id);
    }, AUTO_DISMISS_MS);
    timersRef.current.set(id, timeoutId);
  }, [clearTimer]);

  useEffect(() => {
    const unsubscribe = subscribeToApiErrors((event) => {
      setToasts((prev) => {
        if (event.requestId && prev.some((toast) => toast.requestId === event.requestId)) {
          return prev;
        }

        if (
          prev.some(
            (toast) =>
              toast.userMessage === event.userMessage &&
              toast.errorCode === event.errorCode &&
              event.timestamp - toast.timestamp < 1000
          )
        ) {
          return prev;
        }

        const nextToast: ErrorToastState = {
          ...event,
          visible: true
        };

        return [...prev, nextToast].slice(-4);
      });

      scheduleRemoval(event.id);
    });

    return () => {
      unsubscribe();
      timersRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timersRef.current.clear();
    };
  }, [scheduleRemoval]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="error-toasts" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="error-toast"
          role="alert"
          aria-live="assertive"
        >
          <div className="error-toast__icon" aria-hidden="true">
            ⚠️
          </div>
          <div className="error-toast__content">
            <p className="error-toast__message">{toast.userMessage}</p>
            <div className="error-toast__meta">
              <span className="error-toast__code">{toast.errorCode}</span>
              {toast.requestId && (
                <span className="error-toast__request">
                  Ref&nbsp;#{toast.requestId.slice(-6)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="error-toast__close"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ErrorToasts;


