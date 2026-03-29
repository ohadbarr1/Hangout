import { Platform, Alert } from 'react-native';

export function showAlert(title: string, message?: string, buttons?: Array<{text: string, onPress?: () => void, style?: string}>) {
  if (Platform.OS === 'web') {
    // For simple alerts, use window.alert
    // For confirms with actions, use window.confirm
    if (buttons && buttons.length > 1) {
      const actionButton = buttons.find(b => b.style !== 'cancel');
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      if (confirmed && actionButton?.onPress) {
        actionButton.onPress();
      }
    } else {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
}
