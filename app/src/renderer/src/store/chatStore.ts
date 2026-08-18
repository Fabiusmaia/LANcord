import { create } from "zustand";
import type { ChatMessage } from "@renderer/types";

type ChatState = {
  messages: ChatMessage[];
};

type ChatActions = {
  addMessage: (message: ChatMessage) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  messages: [],
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  reset: () => set({ messages: [] }),
}));
