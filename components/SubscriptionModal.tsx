import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSubscriptionStore } from '@/lib/store/subscriptionStore';
import { showAlert } from '@/lib/utils/globalAlert';
import { TickCircle } from 'iconsax-react-native';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SubscriptionModal = ({ visible, onClose }: SubscriptionModalProps) => {
  const { initialize } = useSubscriptionStore();

  const handleCompletion = async (customerInfo: any) => {
    console.log('💰 [SubscriptionModal] Purchase/Restore Completed!');
    
    // Refresh status di store
    await initialize();

    const currentIsPro = useSubscriptionStore.getState().isPro;
    
    if (currentIsPro) {
       showAlert(
          "Welcome to Recook Pro!",
          "You now have unlimited access to Meal Planner and AI Recipes.",
          undefined,
          {
             icon: <TickCircle size={32} color="#10B981" variant="Bold" />
          }
       );
    }

    onClose();
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <RevenueCatUI.Paywall
          onPurchaseCompleted={({ customerInfo }) => handleCompletion(customerInfo)}
          onRestoreCompleted={({ customerInfo }) => handleCompletion(customerInfo)}
          onDismiss={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
