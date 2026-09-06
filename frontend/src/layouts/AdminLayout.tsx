import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { BottomNav } from '../components/common/BottomNav';

export const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-dark-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};
