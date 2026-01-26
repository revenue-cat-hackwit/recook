import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

interface UseAudioRecorderOptions {
  onSilenceDetected?: () => void;
  silenceThreshold?: number;
  silenceDuration?: number;
  maxDuration?: number; // Optional limit
}

export const useAudioRecorder = (options: UseAudioRecorderOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [metering, setMetering] = useState(-160);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef(false);

  // Defaults
  const SILENCE_THRESHOLD = options.silenceThreshold || -50;
  const SILENCE_DURATION = options.silenceDuration || 2000;

  useEffect(() => {
    return () => {
      stopRecording(); // Cleanup on unmount
    };
  }, []);

  const requestPermission = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      setHasPermission(perm.status === 'granted');
      return perm.status === 'granted';
    } catch (e) {
      console.error('Permission Err', e);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert('Izin Ditolak', 'Mohon izinkan akses mikrofon.');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;
      setIsRecording(true);
      isSpeakingRef.current = false;
      setMetering(-160);

      // Metering Loop
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;

        const curMetering = status.metering || -160;
        setMetering(curMetering);

        // Logic for Auto-Silence Detection (if callback provided)
        if (options.onSilenceDetected) {
          // Speech Start
          if (curMetering > SILENCE_THRESHOLD) {
            isSpeakingRef.current = true;
            if (silenceTimer.current) {
              clearTimeout(silenceTimer.current);
              silenceTimer.current = null;
            }
          }

          // Speech End (Silence)
          if (isSpeakingRef.current && curMetering < SILENCE_THRESHOLD) {
            if (!silenceTimer.current) {
              silenceTimer.current = setTimeout(() => {
                options.onSilenceDetected?.();
              }, SILENCE_DURATION);
            }
          }
        }
      });
    } catch (err) {
      console.error('Start Rec Error', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!recordingRef.current) return null;

    setIsRecording(false);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      return uri;
    } catch (error) {
      console.error('Stop Rec Error', error);
      return null;
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
  };

  return {
    isRecording,
    metering,
    startRecording,
    stopRecording,
    cancelRecording,
    hasPermission,
  };
};
