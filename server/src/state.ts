import type { Member } from "./types.js";

const members = new Map<string, Member>();

export function addMember(id: string, username: string): Member {
  const member: Member = { id, username, muted: false, sharing: false, joinedAt: Date.now() };
  members.set(id, member);
  return member;
}

export function removeMember(id: string): void {
  members.delete(id);
}

export function getMember(id: string): Member | undefined {
  return members.get(id);
}

export function getRoster(excludeId?: string): Member[] {
  const all = Array.from(members.values());
  return excludeId ? all.filter((m) => m.id !== excludeId) : all;
}

export function updateStatus(id: string, status: { muted?: boolean; sharing?: boolean }): Member | undefined {
  const member = members.get(id);
  if (!member) return undefined;
  if (status.muted !== undefined) member.muted = status.muted;
  if (status.sharing !== undefined) member.sharing = status.sharing;
  return member;
}
