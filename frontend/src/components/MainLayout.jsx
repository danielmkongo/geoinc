import React from 'react';
import { Sidebar } from './Sidebar';

export const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="lg:pl-0">
          {children}
        </div>
      </main>
    </div>
  );
};
