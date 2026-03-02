import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  avatar?: string;
  preferences?: {
    personality: string;
    language: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (email: string, name: string, password?: string) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, name: string, password?: string) => {
    // In a real app, we'd verify the password here
    const newUser: User = { 
      email, 
      name, 
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      preferences: {
        personality: 'Concise & Direct',
        language: 'English (US)'
      }
    };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateUser = (data: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, updateUser, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
