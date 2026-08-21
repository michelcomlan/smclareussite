import React from 'react';

export default function ProgressBar({ courant, total }) {
  const pourcentage = Math.round((courant / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 font-mono text-xs text-creme-50/70">
        <span>
          Question {courant} / {total}
        </span>
        <span>{pourcentage}%</span>
      </div>
      <div className="h-2 rounded-full bg-creme-50/15 overflow-hidden">
        <div
          className="h-full bg-or-400 transition-all duration-300"
          style={{ width: `${pourcentage}%` }}
          role="progressbar"
          aria-valuenow={pourcentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
