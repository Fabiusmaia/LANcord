import { create } from "zustand";
import type { Room } from "@renderer/types";

type RoomState = {
  rooms: Room[];
  currentRoom: Room | null;
  error: string | null;
};

type RoomActions = {
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: RoomState = {
  rooms: [],
  currentRoom: null,
  error: null,
};

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
