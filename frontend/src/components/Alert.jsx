import React from 'react';
import { MdClose } from 'react-icons/md';

export const Alert = ({ type = 'info', title, message, onClose, icon: Icon }) => {
  const typeColors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  };

  return (
    <div className={`card border ${typeColors[type]} flex items-start gap-4 animate-slide`}>
      <div className="flex-1">
        {Icon && <Icon className="text-2xl mb-2" />}
        {title && <h3 className="font-bold mb-1">{title}</h3>}
        {message && <p className="text-sm opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:opacity-70">
          <MdClose className="text-xl" />
        </button>
      )}
    </div>
  );
};
