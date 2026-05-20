'use client';

import { Toaster as HotToaster, toast as hotToast, useToaster as useHotToaster } from 'react-hot-toast';

export const ToastProvider = HotToaster;

// 自定义 Toast 组件(兼容旧接口)
export function Toast({ message, type = 'success' }: {
  message: string;
  type?: 'success' | 'error' | 'info';
}) {
  if (type === 'error') {
    hotToast.error(message);
  } else {
    hotToast.success(message);
  }
  return null;
}

export const toast = {
  success: (message: string) => hotToast.success(message),
  error: (message: string) => hotToast.error(message),
  loading: (message: string) => hotToast.loading(message),
  dismiss: (id?: string) => hotToast.dismiss(id),
};

export { hotToast };

export function useToast() {
  const { toasts } = useHotToaster();

  return {
    toasts: toasts.map((t) => ({
      id: t.id,
      message: typeof t.message === 'string' ? t.message : '',
      type: (t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : 'info') as 'success' | 'error' | 'info',
    })),
  };
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  if (type === 'error') {
    hotToast.error(message);
  } else {
    hotToast.success(message);
  }
}