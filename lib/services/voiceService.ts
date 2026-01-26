import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { VoiceConfig, VoiceResponse } from '@/lib/types';

export const VoiceService = {
  /**
   * Uploads audio to backend for processing.
   * @param audioUri URI of the local audio file
   * @param config configuration for voice/language
   * @param sttOnly if true, only returns transcript (skips LLM/TTS)
   */
  async processAudio(
    audioUri: string,
    config: VoiceConfig,
    sttOnly: boolean = false,
  ): Promise<VoiceResponse> {
    try {
      const formData = new FormData();
      const filename = audioUri.split('/').pop() || 'recording.m4a';

      formData.append('audio', {
        uri: audioUri,
        name: filename,
        type: 'audio/m4a',
      } as any);

      const payloadConfig = {
        ...config,
        stt_only: sttOnly,
      };

      formData.append('config', JSON.stringify(payloadConfig));

      const token = supabaseAnonKey;
      if (!token) throw new Error('No Auth Token');

      const response = await fetch(`${supabaseUrl}/functions/v1/voice-processor`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Voice Service Error: ${err}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice Service Error:', error);
      throw error;
    }
  },
};
