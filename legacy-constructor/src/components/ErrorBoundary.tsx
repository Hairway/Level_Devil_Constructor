import * as React from 'react';
import { type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Isolates optional features (e.g. Firebase/Drive) so a failure there can't take down the studio.
// Fields are declared explicitly because this project has no @types/react.
export default class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('ErrorBoundary caught:', error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
