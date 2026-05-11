import { Component } from "react";

interface Props {
  children?: React.ReactNode;
  startupError?: Error;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    const error = this.props.startupError ?? this.state.error;

    if (this.props.startupError || this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-1000">
          <h1 className="text-xl font-bold text-error">Something went wrong</h1>
          <p className="text-sm text-neutral-500">{error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-full"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
