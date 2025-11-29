import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Optional: Send error to logging service (e.g., Sentry)
    // if (process.env.NODE_ENV === 'production') {
    //   // Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 dark:bg-red-700 p-6 flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-red-100 text-sm mt-1">
                  The application encountered an unexpected error
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Error Message
                </h2>
                <p className="text-gray-900 dark:text-white font-mono text-sm break-words">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <summary className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                    Component Stack (Development Only)
                  </summary>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 mt-3 overflow-x-auto whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <details className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <summary className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 mt-3 overflow-x-auto whitespace-pre-wrap font-mono">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>What to do:</strong> Try clicking "Try Again" first. If the error persists,
                reload the page or clear your browser cache. If problems continue, please contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
