'use client';

import { useState, useCallback } from 'react';

interface AlertOptions {
  title?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

export function useModal() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
    options: AlertOptions;
  }>({
    isOpen: false,
    message: '',
    options: {}
  });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    message: '',
    options: {},
    resolve: null
  });

  const showAlert = useCallback((message: string, options: AlertOptions = {}) => {
    setAlertState({
      isOpen: true,
      message,
      options
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showConfirm = useCallback((message: string, options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        options,
        resolve
      });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean = false) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({
      isOpen: false,
      message: '',
      options: {},
      resolve: null
    });
  }, [confirmState.resolve]);

  return {
    alertState,
    confirmState,
    showAlert,
    closeAlert,
    showConfirm,
    closeConfirm
  };
}
