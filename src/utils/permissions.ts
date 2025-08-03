// utils/permissions.ts
import { useAuthStore } from '../stores/useAuthStore';

export function hasPermission(key: string): boolean {
    const permissions = useAuthStore.getState().permissions;
    return permissions[key] === true;
}
