import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and set user
      setUser({}); // Placeholder
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { username: email, password }); // Note: backend uses username, but frontend uses email
      if (response.data.mfaRequired) {
        setMfaRequired(true);
        setTempToken(response.data.tempToken);
        return { success: false, mfaRequired: true };
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setMfaRequired(false);
      setTempToken(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
  };

  const verifyMFA = async (token) => {
    try {
      const response = await api.post('/auth/mfa/verify-login', { tempToken, token });
      const { token: finalToken, user } = response.data;
      localStorage.setItem('token', finalToken);
      setUser(user);
      setMfaRequired(false);
      setTempToken(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'MFA verification failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    verifyMFA,
    mfaRequired,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};