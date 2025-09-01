import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  error: Error | null;
  onRetry?: () => void;
}

export default function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <h3 className="text-lg font-semibold text-red-300">Error Loading Menu</h3>
        </div>
        <p className="text-red-200 mb-4">
          {error?.message || 'Failed to load menu items. Please try again.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}