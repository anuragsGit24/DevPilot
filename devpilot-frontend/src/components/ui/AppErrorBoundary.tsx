import { Component, type ReactNode } from 'react';
import { Button } from './Button';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-dvh bg-slate-50 flex items-center justify-center p-6">
          <div role="alert" className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-900">This page couldn’t load</h1>
            <p className="mt-3 mb-6 text-sm text-slate-600">Reload the workspace to try again. Any unsaved changes on this page may need to be entered again.</p>
            <Button onClick={() => window.location.reload()}>Reload workspace</Button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
