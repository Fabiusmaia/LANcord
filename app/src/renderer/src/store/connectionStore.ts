import { create } from "zustand";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

type ConnectionState = {
  status: ConnectionStatus;
  selfId: string | null;
  username: string;
  address: string;
  error: string | null;
};

type ConnectionActions = {
  setStatus: (status: ConnectionStatus) => void;
  setSelf: (selfId: string, username: string, address: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: ConnectionState = {
  status: "disconnected",
  selfId: null,
  username: "",
  address: "",
  error: null,
};

export const useConnectionStore = create<ConnectionState & ConnectionActions>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setSelf: (selfId, username, address) => set({ selfId, username, address }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
