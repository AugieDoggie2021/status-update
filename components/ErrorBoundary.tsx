"use client";

import React from "react";

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ClientErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm mt-2">Try reloading. If this persists, sign in again or contact the owner.</p>
        </div>
      );
    }
    return this.props.children as any;
  }
}


