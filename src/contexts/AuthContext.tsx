
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { localStorageService } from '@/lib/localStorage';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  currentUser: (User & { role: UserRole }) | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (userData: Pick<User, 'email' | 'password' | 'name'>) => Promise<User | null>;
  logout: () => void;
  refreshUser: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromStorage = useCallback(() => {
    setIsLoading(true);
    const storedUser = localStorageService.getCurrentUser();
    if (storedUser) {
      const fullUser = localStorageService.findUserByEmail(storedUser.email);
      if (fullUser) {
        setCurrentUser(fullUser as User & { role: UserRole });
      } else {
        // Stored user info is stale or user deleted
        localStorageService.setCurrentUser(null);
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserFromStorage();
    // Initialize default admin and mock data if not present
    localStorageService.initializeData();
  }, [loadUserFromStorage]);

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    const user = localStorageService.findUserByEmail(email);
    if (user && user.password === password) {
      localStorageService.setCurrentUser(user);
      setCurrentUser(user as User & { role: UserRole });
      localStorageService.addLoginActivity(user.id, user.email, 'login');
      setIsLoading(false);
      return user;
    }
    setIsLoading(false);
    return null;
  };

  const signup = async (userData: Pick<User, 'email' | 'password' | 'name'>): Promise<User | null> => {
    setIsLoading(true);
    const existingUser = localStorageService.findUserByEmail(userData.email);
    if (existingUser) {
      setIsLoading(false);
      return null; // User already exists
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: 'customer', // Default role
      createdAt: new Date().toISOString(),
    };
    const addedUser = localStorageService.addUser(newUser);
    // Optionally auto-login after signup
    // localStorageService.setCurrentUser(addedUser);
    // setCurrentUser(addedUser as User & { role: UserRole });
    // localStorageService.addLoginActivity(addedUser.id, addedUser.email, 'login');
    setIsLoading(false);
    return addedUser;
  };

  const logout = () => {
    if (currentUser) {
        localStorageService.addLoginActivity(currentUser.id, currentUser.email, 'logout');
    }
    localStorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const refreshUser = () => {
    loadUserFromStorage();
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
