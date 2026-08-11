import React, { createContext, useContext, useCallback } from 'react';
import { App } from 'antd';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { message } = App.useApp();

  const show = useCallback((msg, type = 'error') => {
    if (type === 'success') {
      message.success(msg);
    } else if (type === 'info') {
      message.info(msg);
    } else {
      message.error(msg);
    }
  }, [message]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
