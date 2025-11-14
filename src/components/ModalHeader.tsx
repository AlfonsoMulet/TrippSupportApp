import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  rightButton?: {
    text: string;
    onPress: () => void;
    disabled?: boolean;
  };
}

export default function ModalHeader({ title, onClose, rightButton }: ModalHeaderProps) {
  const { theme } = useThemeStore();
  
  return (
    <View style={[styles.header, { 
      backgroundColor: theme.colors.header,
      borderBottomColor: theme.colors.border 
    }]}>
      <TouchableOpacity onPress={onClose} style={styles.leftButton}>
        <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
          Cancel
        </Text>
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      
      {rightButton ? (
        <TouchableOpacity 
          onPress={rightButton.onPress} 
          disabled={rightButton.disabled}
          style={styles.rightButton}
        >
          <Text style={[
            styles.actionText, 
            { 
              color: rightButton.disabled ? theme.colors.textSecondary : theme.colors.primary,
              opacity: rightButton.disabled ? 0.5 : 1
            }
          ]}>
            {rightButton.text}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.rightButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  leftButton: {
    minWidth: 60,
  },
  rightButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
