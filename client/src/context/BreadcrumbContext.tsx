import React, { createContext, useContext, useState, useCallback } from 'react';

interface BreadcrumbContextType {
  dynamicLabels: Record<string, string>;
  setDynamicLabel: (path: string, label: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});

  const setDynamicLabel = useCallback((path: string, label: string) => {
    setDynamicLabels((prev) => {
      if (prev[path] === label) return prev;
      return { ...prev, [path]: label };
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ dynamicLabels, setDynamicLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
};
