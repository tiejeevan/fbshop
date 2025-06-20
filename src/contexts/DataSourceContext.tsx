
// src/contexts/DataSourceContext.tsx
'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext, useMemo } from 'react';
import type { DataSourceType } from '@/types';
import { localStorageDataService as localDBService } from '@/lib/localStorageDataService'; // Renamed
import { firestoreDataService as fsService } from '@/lib/firestoreDataService';
import type { IDataService } from '@/lib/dataService';
import { db as firebaseDBInstance } from '@/lib/firebase'; // Import the initialized db instance

interface DataSourceContextType {
  dataSourceType: DataSourceType;
  setDataSourceType: (type: DataSourceType) => void;
  dataService: IDataService;
  isLoading: boolean;
}

export const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

const DATA_SOURCE_KEY = 'localcommerce_dataSourceType';

export const DataSourceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataSourceType, setDataSourceState] = useState<DataSourceType>('local');
  const [isLoading, setIsLoading] = useState(true);
  // Initialize with localDBService by default
  const [currentDataService, setCurrentDataService] = useState<IDataService>(localDBService);

  useEffect(() => {
    const storedSource = typeof window !== 'undefined' ? localStorage.getItem(DATA_SOURCE_KEY) as DataSourceType | null : null;
    const initialSource = storedSource || 'local';
    setDataSourceState(initialSource);
    // Initial loading false after setting source type. useEffect below will handle service switch.
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const switchService = async () => {
      if (dataSourceType === 'firebase') {
        if (firebaseDBInstance) {
          fsService.initialize(firebaseDBInstance); // Ensure Firestore service is initialized
          await fsService.initializeData(); // Seed Firestore if needed
          if (isMounted) setCurrentDataService(fsService);
          console.log("Data source switched to Firebase Firestore.");
        } else {
          console.warn("Firebase DB not available during switch, falling back to local storage.");
          if (isMounted) {
            setDataSourceState('local'); // Fallback
            setCurrentDataService(localDBService);
          }
        }
      } else {
        await localDBService.initializeData(); // Ensure local data is initialized/seeded
        if (isMounted) setCurrentDataService(localDBService);
        console.log("Data source switched to Local Storage.");
      }
      if (isMounted) setIsLoading(false);
    };

    switchService();
    
    return () => {
      isMounted = false;
    };
  }, [dataSourceType]);

  const setAndPersistDataSourceType = (type: DataSourceType) => {
    if (type === 'firebase' && !firebaseDBInstance) {
        alert("Firebase is not configured correctly in your .env file. Cannot switch to Firebase data source.");
        console.error("Attempted to switch to Firebase, but Firebase DB instance is not available. Check Firebase configuration.");
        return; // Prevent switching if Firebase isn't ready
    }
    localStorage.setItem(DATA_SOURCE_KEY, type);
    setDataSourceState(type);
  };

  const contextValue = useMemo(() => ({
    dataSourceType,
    setDataSourceType: setAndPersistDataSourceType,
    dataService: currentDataService,
    isLoading
  }), [dataSourceType, currentDataService, isLoading]);

  return (
    <DataSourceContext.Provider value={contextValue}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = () => {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
};
