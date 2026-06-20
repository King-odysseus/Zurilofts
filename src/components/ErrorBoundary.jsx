import { Component } from 'react';
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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#0B0B45] mb-2">Something went wrong</h1>
              <p className="text-[#6b7280] mb-6">
                We&apos;re sorry — an unexpected error occurred. Try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#C49A6C] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
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
