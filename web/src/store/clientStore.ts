import { create } from 'zustand';
import type { ClientMe } from '../api/client';

interface ClientState {
  client: ClientMe | null;
  loaded: boolean;
  set: (c: ClientMe | null) => void;
  clear: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  client: null,
  loaded: false,
  set:   (client) => set({ client, loaded: true }),
  clear: ()       => set({ client: null, loaded: false }),
}));
