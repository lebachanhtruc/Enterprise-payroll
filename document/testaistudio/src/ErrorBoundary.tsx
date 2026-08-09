import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-red-100 p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
            <p className="text-slate-700 mb-4">An error occurred in the application. Please try reloading the page.</p>
            
            {this.state.error && (
              <div className="bg-slate-100 p-4 rounded-lg overflow-auto mb-4 border border-slate-200">
                <p className="font-mono text-sm font-bold text-slate-800 mb-2">{this.state.error.toString()}</p>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              </div>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700"
            >
              Reload Page
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="ml-4 bg-red-100 text-red-700 px-6 py-2 rounded-lg font-bold hover:bg-red-200"
            >
              Clear Data & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
