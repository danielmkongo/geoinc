import React from 'react';

export const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
  const sizeClasses = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-14 h-14' };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`${sizeClasses[size]} rounded-full border-gray-200 dark:border-slate-700 border-t-blue-500 animate-spin`}
        style={{ borderWidth: size === 'sm' ? 2 : size === 'md' ? 3 : 4 }}
      />
      {fullScreen && (
        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Loading...</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-gray-100 dark:border-slate-700 border-t-blue-500 animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return <div className="flex justify-center items-center p-8">{spinner}</div>;
};
