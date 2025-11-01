// src/context/SessionContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};

export const SessionProvider = ({ children }) => {
  const [sessionKey, setSessionKey] = useState(() => {
    let key = localStorage.getItem('guest_session_key');
    if (!key) {
      key = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guest_session_key', key);
    }
    return key;
  });

  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem('guest_session_key');
      localStorage.removeItem('guest_cart');
      const newKey = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guest_session_key', newKey);
      setSessionKey(newKey);
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    };
    window.addEventListener('userLoggedOut', handleLogout);
    return () => window.removeEventListener('userLoggedOut', handleLogout);
  }, []);

  return (
    <SessionContext.Provider value={{ sessionKey }}>
      {children}
    </SessionContext.Provider>
  );
};