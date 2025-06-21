
'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { User, UserRole, Theme } from '@/types';
import { useDataSource } from './DataSourceContext';

interface AuthContextType {
  currentUser: (User & { role: UserRole }) | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (userData: Pick<User, 'email' | 'password' | 'name'>) => Promise<User | null>;
  logout: () => Promise<void>; // Changed to async
  refreshUser: () => void;
  updateUserThemePreference: (theme: Theme) => Promise<void>; // Changed to async
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { dataService, isLoading: isDataSourceLoading, dataSourceType } = useDataSource();
  const [currentUser, setCurrentUser] = useState<(User & { role: UserRole }) | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Renamed from isLoading to avoid conflict

  const loadUserFromSession = useCallback(async () => {
    if (isDataSourceLoading) {
      // console.log("AuthContext: Waiting for data source to load before loading user from session.");
      return;
    }
    // console.log("AuthContext: Data source loaded, attempting to load user from session.");
    setIsAuthLoading(true);
    const storedUser = dataService.getCurrentUser(); // This is synchronous for session key
    if (storedUser) {
      try {
        const fullUser = await dataService.findUserByEmail(storedUser.email); // Fetch full user details async
        if (fullUser) {
          setCurrentUser(fullUser as User & { role: UserRole });
        } else {
          dataService.setCurrentUser(null); // Clear potentially stale session if full user not found
          setCurrentUser(null);
        }
      } catch (error) {
          console.error("AuthContext: Error fetching full user details:", error);
          dataService.setCurrentUser(null);
          setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
    setIsAuthLoading(false);
    // console.log("AuthContext: User session loading complete. CurrentUser:", currentUser ? currentUser.email : 'null');
  }, [dataService, isDataSourceLoading]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isDataSourceLoading) { // Only proceed if data source context is no longer loading
        // console.log("AuthContext: Initializing data and loading user from session.");
        await dataService.initializeData(); // Initialize data source (local or FS)
        await loadUserFromSession();
      }
    };
    initializeAuth();
  }, [dataService, loadUserFromSession, isDataSourceLoading]);
  
  // Effect to reload user if data source type or service instance changes
  useEffect(() => {
    if (!isDataSourceLoading) {
        // console.log("AuthContext: Data source type or service changed, reloading user from session.", dataSourceType);
        loadUserFromSession();
    }
  }, [dataSourceType, dataService, loadUserFromSession, isDataSourceLoading]);


  const login = async (email: string, password: string): Promise<User | null> => {
    if (isDataSourceLoading) {
        console.warn("Login attempt while data source is loading.");
        return null;
    }
    setIsAuthLoading(true);
    const user = await dataService.findUserByEmail(email);
    // For Firestore, password checking would ideally be via Firebase Auth, not direct comparison.
    // This direct password check is for localStorage compatibility.
    if (user && user.password === password) {
      dataService.setCurrentUser(user);
      setCurrentUser(user as User & { role: UserRole });
      await dataService.addActivityLog({ actorId: user.id, actorEmail: user.email, actorRole: user.role, actionType: 'AUTH_LOGIN', description: 'User logged in.' });
      setIsAuthLoading(false);
      return user;
    }
    setIsAuthLoading(false);
    return null;
  };

  const signup = async (userData: Pick<User, 'email' | 'password' | 'name'>): Promise<User | null> => {
     if (isDataSourceLoading) {
        console.warn("Signup attempt while data source is loading.");
        return null;
    }
    setIsAuthLoading(true);
    const existingUser = await dataService.findUserByEmail(userData.email);
    if (existingUser) {
      setIsAuthLoading(false);
      return null; // User already exists
    }
    const addedUser = await dataService.addUser({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: 'customer',
      themePreference: 'system',
    });
    await dataService.addActivityLog({ actorId: addedUser.id, actorEmail: addedUser.email, actorRole: 'customer', actionType: 'AUTH_SIGNUP', description: 'New user account created.' });
    setIsAuthLoading(false);
    return addedUser;
  };

  const logout = async () => {
    if (currentUser) {
        await dataService.addActivityLog({ actorId: currentUser.id, actorEmail: currentUser.email, actorRole: currentUser.role, actionType: 'AUTH_LOGOUT', description: 'User logged out.' });
    }
    dataService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const refreshUser = useCallback(() => {
    if (!isDataSourceLoading) { // Check if data source is ready before refreshing
        loadUserFromSession();
    }
  }, [loadUserFromSession, isDataSourceLoading]);

  const updateUserThemePreference = async (theme: Theme) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, themePreference: theme };
      const result = await dataService.updateUser(updatedUser);
      if (result) {
        setCurrentUser(result as User & {role: UserRole}); // Update context immediately if successful
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading: isAuthLoading || isDataSourceLoading, login, signup, logout, refreshUser, updateUserThemePreference }}>
      {children}
    </AuthContext.Provider>
  );
};
