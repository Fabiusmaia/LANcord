import { create } from "zustand";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

type ConnectionState = {
  status: ConnectionStatus;
  selfId: string | null;
  username: string;
  host: string;
  port: number;
  error: string | null;
};

type ConnectionActions = {
  setStatus: (status: ConnectionStatus) => void;
  setSelf: (selfId: string, username: string, host: string, port: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: ConnectionState = {
  status: "disconnected",
  selfId: null,
  username: "",
  host: "",
  port: 3001,
  error: null,
};

export const useConnectionStore = create<ConnectionState & ConnectionActions>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setSelf: (selfId, username, host, port) => set({ selfId, username, host, port }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
