import React, { useRef } from 'react';
import type { FileRef } from '../../types/field';

interface FilePickButtonProps {
  label: string;
  onPick: (files: FileRef[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Hint the browser to open the camera. Only happens when the user taps this button. */
  capture?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

/** Opens the file picker only on an explicit tap. Files are not uploaded — the demo keeps only their name and size. */
export function FilePickButton({ label, onPick, accept, multiple, capture, icon, className = '' }: FilePickButtonProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-50 sm:h-8 sm:text-[12px] ${className}`}>
        
        {icon}
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        accept={accept}
        multiple={multiple}
        {...capture ? { capture: 'environment' as const } : {}}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).map((f) => ({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)) }));
          if (files.length) onPick(files);
          e.target.value = '';
        }} />
      
    </>);

}