import { create } from "zustand";
import type { Member } from "@renderer/types";

type MembersState = {
  members: Record<string, Member>;
};

type MembersActions = {
  setRoster: (members: Member[]) => void;
  addMember: (member: Member) => void;
  removeMember: (id: string) => void;
  updateStatus: (id: string, status: { muted?: boolean; sharing?: boolean }) => void;
  reset: () => void;
};

export const useMembersStore = create<MembersState & MembersActions>((set) => ({
  members: {},
  setRoster: (members) =>
    set({ members: Object.fromEntries(members.map((m) => [m.id, m])) }),
  addMember: (member) => set((s) => ({ members: { ...s.members, [member.id]: member } })),
  removeMember: (id) =>
    set((s) => {
      const next = { ...s.members };
      delete next[id];
      return { members: next };
    }),
  updateStatus: (id, status) =>
    set((s) => {
      const existing = s.members[id];
      if (!existing) return s;
      return { members: { ...s.members, [id]: { ...existing, ...status } } };
    }),
  reset: () => set({ members: {} }),
}));
