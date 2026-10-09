import { useCallback, useEffect, useState } from 'react';

export function useSuccessFeedback() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 3500);
    return () => clearTimeout(timeout);
  }, [message]);

  const showSuccess = useCallback((successMessage: string) => {
    setMessage(successMessage);
  }, []);

  const clearSuccess = useCallback(() => {
    setMessage('');
  }, []);

  return { successMessage: message, showSuccess, clearSuccess };
}
