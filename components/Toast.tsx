import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ToastRef {
  show: (message: string, type?: 'success' | 'error' | 'info') => void;
  hide: () => void;
}

const Toast = forwardRef<ToastRef, {}>((props, ref) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('info');

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    show: (msg, toastType = 'info') => {
      setMessage(msg);
      setType(toastType);
      setVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);

      // Animate In
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
        }),
      ]).start();

      // Auto Hide
      timerRef.current = setTimeout(() => {
        hide();
      }, 3000);
    },
    hide,
  }));

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  const bgColors = {
    success: '#10B981', // Emerald 500
    error: '#EF4444', // Red 500
    info: '#3B82F6', // Blue 500
  };

  const icons = {
    success: 'checkmark-circle' as const,
    error: 'alert-circle' as const,
    info: 'information-circle' as const,
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: bgColors[type],
          top: insets.top + 10,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icons[type]} size={24} color="white" />
        <Text style={styles.text}>{message}</Text>
      </View>
      <TouchableOpacity onPress={hide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={20} color="white" style={{ opacity: 0.8 }} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', // Fallback font
  },
});

export default Toast;
