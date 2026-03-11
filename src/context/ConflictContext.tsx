/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { VaultEntry } from '../services/vaultService';

export interface ConflictDetails {
    serverData: VaultEntry;
    localData: VaultEntry;
    recordId: string;
    serverVersion: number;
    resolve: (choice: 'local' | 'server') => void;
}

interface ConflictContextType {
    activeConflict: ConflictDetails | null;
    resolveConflict: (choice: 'local' | 'server') => void;
}

const ConflictContext = createContext<ConflictContextType | undefined>(undefined);

export const useConflict = () => {
    const context = useContext(ConflictContext);
    if (!context) {
        throw new Error('useConflict must be used within a ConflictProvider');
    }
    return context;
};

export const ConflictProvider = ({ children }: { children: ReactNode }) => {
    const [activeConflict, setActiveConflict] = useState<ConflictDetails | null>(null);

    useEffect(() => {
        const handleConflict = (e: Event) => {
            const customEvent = e as CustomEvent<ConflictDetails>;
            setActiveConflict(customEvent.detail);
        };
        window.addEventListener('sync-conflict', handleConflict);
        return () => window.removeEventListener('sync-conflict', handleConflict);
    }, []);

    const resolveConflict = (choice: 'local' | 'server') => {
        if (activeConflict) {
            activeConflict.resolve(choice);
            setActiveConflict(null);
        }
    };

    return (
        <ConflictContext.Provider value={{ activeConflict, resolveConflict }}>
            {children}
        </ConflictContext.Provider>
    );
};
