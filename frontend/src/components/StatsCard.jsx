import React from 'react';

export const StatCard = ({ title, value, icon, unit, color = 'primary', status = 'normal' }) => {
  const colorClasses = {
    primary: 'from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-700',
    success: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700',
    warning: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700',
    danger: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700',
  };

  const iconColorClasses = {
    primary: 'text-primary-600 dark:text-primary-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  const statusIndicator = {
    normal: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 animate-slideIn`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {value}
            </h3>
            {unit && (
              <span className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                {unit}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className={`p-3 rounded-xl bg-white/50 dark:bg-dark-800/50 ${iconColorClasses[color]}`}>
            {icon}
          </div>
          {status !== 'normal' && (
            <div className={`absolute top-0 right-0 w-3 h-3 ${statusIndicator[status]} rounded-full animate-pulse`} />
          )}
        </div>
      </div>
    </div>
  );
};

export const GaugeCard = ({ title, value, max = 100, color = 'primary' }) => {
  const percentage = (value / max) * 100;
  
  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="card border-2 p-6 animate-slideIn">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
        {title}
      </p>
      <div className="mb-3">
        <div className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color]} transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {percentage.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {value} / {max}
        </span>
      </div>
    </div>
  );
};

export const InfoCard = ({ title, children, icon: Icon }) => {
  return (
    <div className="card p-6 animate-slideIn">
      <div className="flex items-center gap-3 mb-4">
        {Icon && <div className="text-primary-600 dark:text-primary-400">{Icon}</div>}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};
