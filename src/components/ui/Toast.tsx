'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!mounted) return null;

  const bgColor = {
    success: 'bg-leaf-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
  }[type];

  const icon = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
  }[type];

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px]`}>
        <span className="text-lg font-semibold">{icon}</span>
        <span className="text-sm">{message}</span>
      </div>
    </div>,
    document.body
  );
}

// Toast 管理器
let toastId = 0;
const toastListeners = new Set<(toast: { id: number; message: string; type: ToastType }) => void>();

export function showToast(message: string, type: ToastType = 'info') {
  const id = toastId++;
  toastListeners.forEach((listener) => listener({ id, message, type }));
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: ToastType }>>([]);

  useEffect(() => {
    const listener = (toast: { id: number; message: string; type: ToastType }) => {
      setToasts((prev) => [...prev, toast]);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, removeToast };
}
