import { useAuthStore } from '../store/authStore';

/**
 * List of developer email addresses who have access to all features
 * Add your development/testing emails here
 */
const DEVELOPER_EMAILS = [
  'alfonsomuletvazquez@gmail.com'
  // Add developer emails here
  // 'developer@example.com',
];

/**
 * Check if the current user is a developer account
 * @returns true if user is a developer, false otherwise
 */
export function isDeveloperAccount(): boolean {
  const user = useAuthStore.getState().user;

  if (!user || !user.email) {
    return false;
  }

  return DEVELOPER_EMAILS.includes(user.email.toLowerCase());
}

/**
 * Hook to check if current user is a developer
 * Use this in React components
 */
export function useIsDeveloper(): boolean {
  const user = useAuthStore(state => state.user);

  if (!user || !user.email) {
    return false;
  }

  return DEVELOPER_EMAILS.includes(user.email.toLowerCase());
}
