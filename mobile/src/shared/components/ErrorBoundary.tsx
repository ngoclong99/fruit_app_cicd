import React from 'react';
import { ErrorScreen } from './ErrorScreen';

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Catch render-time errors trong subtree, hiển thị fallback UI thay vì
 * white screen of death. Bọc quanh root App hoặc các route quan trọng.
 *
 * Bao quanh App.tsx hoặc từng feature root để cô lập crash.
 *
 * Note: KHÔNG catch:
 *   - Errors trong event handlers (try/catch trong handler)
 *   - Async errors (.catch trên Promise)
 *   - Errors trong SSR
 *   Cho async lỗi: dùng react-query/SWR onError, hoặc unhandledrejection.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // TODO: Send to Sentry/Bugsnag in production
    //   Sentry.captureException(error, { extra: info });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, info);
    }
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return <ErrorScreen error={error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
