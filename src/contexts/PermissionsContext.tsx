// src/contexts/PermissionsContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Permissions = Record<string, boolean>;

interface PermissionsContextType {
    permissions: Permissions;
    setPermissions: React.Dispatch<React.SetStateAction<Permissions>>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider = ({ children }: { children: ReactNode }) => {
    const [permissions, setPermissions] = useState<Permissions>({});

    return (
        <PermissionsContext.Provider value={{ permissions, setPermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
};

export const usePermissions = () => {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error("usePermissions must be used within a PermissionsProvider");
    }
    return context;
};
