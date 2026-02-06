import { create } from 'zustand';

interface ProfileStore {
  shouldRefetch: boolean;
  triggerRefetch: () => void;
  markRefetched: () => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  shouldRefetch: true,
  triggerRefetch: () => set({ shouldRefetch: true }),
  markRefetched: () => set({ shouldRefetch: false }),
}));
