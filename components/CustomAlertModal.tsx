import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut, Easing } from 'react-native-reanimated';

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'destructive';
  icon?: any;
  showCancel?: boolean;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default',
  icon = 'alert-circle',
  showCancel = true,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Internal state to keep the Modal open while animation plays
  const [showModal, setShowModal] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShowModal(true);
    } else {
      // Wait for exit animation (200ms) to finish before unmounting Modal
      const timer = setTimeout(() => setShowModal(false), 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={showModal}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* 
        Conditionally render children based on PROP 'visible'.
        When 'visible' becomes false, these components map to null,
        triggering 'exiting' animations while parent Modal is still open.
      */}
      {visible && (
        <>
          {/* Overlay Backdrop */}
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            className="absolute inset-0 bg-black/60"
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
          </Animated.View>

          {/* Modal Content */}
          <View className="pointer-events-box-none flex-1 items-center justify-center px-6">
            <Animated.View
              entering={ZoomIn.duration(200).easing(Easing.out(Easing.quad))}
              exiting={ZoomOut.duration(200).easing(Easing.in(Easing.quad))}
              className="pointer-events-auto w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#1E1F20]"
            >
              {/* Icon */}
              <View
                className={`mx-auto mb-4 h-16 w-16 items-center justify-center rounded-full ${
                  type === 'destructive'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                {typeof icon === 'string' ? (
                  <Ionicons
                    name={icon as any}
                    size={32}
                    color={type === 'destructive' ? '#EF4444' : isDark ? 'white' : 'black'}
                  />
                ) : (
                  icon
                )}
              </View>

              {/* Text */}
              <Text className="mb-2 text-center font-visby-bold text-xl text-gray-900 dark:text-white">
                {title}
              </Text>
              <Text className="mb-8 text-center font-visby text-base leading-6 text-gray-500 dark:text-gray-400">
                {message}
              </Text>

              {/* Buttons */}
              <View className="flex-row gap-3">
                {showCancel && (
                  <TouchableOpacity
                    onPress={() => {
                      if (onCancel) {
                        onCancel();
                      } else {
                        onClose();
                      }
                    }}
                    className="flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white py-3.5 active:bg-gray-50 dark:border-gray-700 dark:bg-transparent"
                  >
                    <Text className="font-visby-bold text-gray-700 dark:text-gray-300">
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    onConfirm();
                  }}
                  className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
                    type === 'destructive' ? 'bg-[#EF4444]' : 'bg-[#8BD65E]'
                  }`}
                >
                  <Text className="font-visby-bold text-white">{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </>
      )}
    </Modal>
  );
};
