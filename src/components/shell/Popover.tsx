import React from 'react';
import { motion } from 'framer-motion';

interface PopoverProps {
  className?: string;
  children: React.ReactNode;
  direction?: 'down' | 'up';
}

export function Popover({ className = '', children, direction = 'down' }: PopoverProps) {
  const offset = direction === 'down' ? -4 : 4;
  return (
    <motion.div
      initial={{ opacity: 0, y: offset, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: offset, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
      className={`absolute z-50 rounded-md border border-slate-200 bg-white shadow-lg shadow-slate-900/10 ${className}`}>
      
      {children}
    </motion.div>);

}