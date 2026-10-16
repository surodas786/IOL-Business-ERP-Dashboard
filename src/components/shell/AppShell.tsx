import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RecordDrawer } from '../records/RecordDrawer';
import { Breadcrumbs } from './Breadcrumbs';
import { LocationFilters } from './LocationFilters';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((c) => !c);else
    setMobileOpen((o) => !o);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-canvas font-sans text-slate-900">
      <TopBar onToggleSidebar={toggleSidebar} />
      <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-3 py-2 xl:hidden">
        <Breadcrumbs className="lg:hidden" />
        <LocationFilters className="flex flex-wrap" />
      </div>
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={collapsed} className="hidden lg:flex" />
        <AnimatePresence>
          {mobileOpen &&
          <div className="fixed inset-0 z-40 lg:hidden">
              <motion.button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-900/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)} />
            
              <motion.div
              className="absolute inset-y-0 left-0 flex"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}>
              
                <Sidebar collapsed={false} className="flex h-full" />
              </motion.div>
            </div>
          }
        </AnimatePresence>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <RecordDrawer />
    </div>);

}