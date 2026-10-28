import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();

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
        className="relative bg-surface w-full max-w-[390px] mx-auto rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] transform transition-transform duration-300 ease-out translate-y-0 border-t border-surface-container-high/40"
        style={{ animation: 'slideUp 0.3s ease-out forwards' }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        
        <div className="flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-outline-variant rounded-full" />
        </div>
        
        {title && (
          <div className="px-6 pb-4 pt-2 flex justify-between items-center border-b border-surface-container-high/40">
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{title}</h2>
            <button 
              onClick={onClose} 
              aria-label={t('nav.close')}
              className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface transition-colors bg-surface-container-high rounded-full active:scale-95"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
        )}
        
        <div className="overflow-y-auto px-6 pb-8 overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
