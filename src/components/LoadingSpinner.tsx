import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="text-slate-400">Loading menu...</span>
      </div>
    </div>
  );
}