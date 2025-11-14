import { StyleSheet } from 'react-native';
import { Theme } from '../store/themeStore';

export const createThemedStyles = (theme: Theme) => StyleSheet.create({
  // Common components
  header: {
    backgroundColor: theme.colors.background,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  
  modalBackground: {
    flex: 1,
    backgroundColor: theme.colors.modalBackground,
  },
  
  // Common layout patterns
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Common text styles
  text: {
    color: theme.colors.text,
    fontSize: 14,
  },
  
  textSecondary: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  
  textSmall: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  
  // Common borders
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
});
