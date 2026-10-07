import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scroll when open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm" 
        aria-hidden="true"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative bg-surface-50 w-full max-w-[390px] mx-auto rounded-t-3xl shadow-elevation-3 flex flex-col max-h-[90vh] transform transition-transform duration-300 ease-out translate-y-0"
        style={{ animation: 'slideUp 0.3s ease-out forwards' }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        
        <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
          <div className="w-12 h-1.5 bg-border rounded-full cursor-pointer" />
        </div>
        
        {title && (
          <div className="px-6 pb-4 pt-2 flex justify-between items-center">
            <h2 className="text-h3 font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors bg-surface-100 rounded-full">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto px-6 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
};
