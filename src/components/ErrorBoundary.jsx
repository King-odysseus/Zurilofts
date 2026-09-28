import { Component } from 'react';
import { CircleAlert } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // A deploy can leave an older service-worker shell pointing at a removed
    // lazy chunk. Recover once instead of trapping users on the error screen.
    const message = String(error?.message || '');
    const isChunkLoadFailure = /dynamically imported module|Loading chunk|ChunkLoadError|importing a module script failed/i.test(message);
    if (isChunkLoadFailure) {
      try {
        const recoveryKey = 'zurilofts-chunk-recovery';
        if (!sessionStorage.getItem(recoveryKey)) {
          sessionStorage.setItem(recoveryKey, '1');
          if (navigator.serviceWorker) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
              registrations.forEach((registration) => registration.update());
              window.location.reload();
            }).catch(() => window.location.reload());
          } else {
            window.location.reload();
          }
        }
      } catch {
        // Storage and service-worker APIs can be unavailable in private mode.
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FDECEC]">
                <CircleAlert className="h-10 w-10 text-[#B42318]" strokeWidth={2} aria-hidden="true" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-[#0B1F42]">Something went wrong</h1>
              <p className="mb-6 text-[#5B6B82]">
                We&apos;re sorry - an unexpected error occurred. Try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-[10px] bg-[#0B1F42] px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-[#07072E]"
              >
                Refresh Page
              </button>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
