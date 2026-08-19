import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Member, Room } from "./types.js";

type InternalMember = Member & { roomId: string | null };
type InternalRoom = { id: string; name: string; passwordHash: string | null; memberIds: Set<string> };

export const MAX_MEMBERS_PER_ROOM = 30;

const members = new Map<string, InternalMember>();
const rooms = new Map<string, InternalRoom>();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function toPublicRoom(room: InternalRoom): Room {
  return { id: room.id, name: room.name, hasPassword: room.passwordHash !== null, memberCount: room.memberIds.size };
}

export function createRoom(name: string, password: string | undefined): Room {
  const id = randomUUID();
  const room: InternalRoom = {
    id,
    name,
    passwordHash: password ? hashPassword(password) : null,
    memberIds: new Set(),
  };
  rooms.set(id, room);
  return toPublicRoom(room);
}

export function listRooms(): Room[] {
  return Array.from(rooms.values()).map(toPublicRoom);
}

export function getRoomForJoin(
  roomId: string,
  password: string | undefined
): { ok: true } | { ok: false; reason: "not_found" | "wrong_password" | "full" } {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, reason: "not_found" };
  if (room.memberIds.size >= MAX_MEMBERS_PER_ROOM) return { ok: false, reason: "full" };
  if (room.passwordHash && (!password || !verifyPassword(password, room.passwordHash))) {
    return { ok: false, reason: "wrong_password" };
  }
  return { ok: true };
}

export function joinRoom(roomId: string, memberId: string): void {
  const room = rooms.get(roomId);
  const member = members.get(memberId);
  if (!room || !member) return;
  room.memberIds.add(memberId);
  member.roomId = roomId;
}

export function leaveRoom(memberId: string): string | null {
  const member = members.get(memberId);
  if (!member || !member.roomId) return null;
  const roomId = member.roomId;
  const room = rooms.get(roomId);
  room?.memberIds.delete(memberId);
  member.roomId = null;
  // Salas vazias sao removidas, exceto a sala default (nunca fica sem dono).
  if (room && room.memberIds.size === 0 && roomId !== DEFAULT_ROOM_ID) rooms.delete(roomId);
  return roomId;
}

export function addMember(id: string, username: string): Member {
  const member: InternalMember = { id, username, muted: false, sharing: false, joinedAt: Date.now(), roomId: null };
  members.set(id, member);
  return toPublicMember(member);
}

export function removeMember(id: string): void {
  members.delete(id);
}

export function getMember(id: string): Member | undefined {
  const member = members.get(id);
  return member ? toPublicMember(member) : undefined;
}

export function getMemberRoomId(id: string): string | null {
  return members.get(id)?.roomId ?? null;
}

function toPublicMember(member: InternalMember): Member {
  const { roomId: _roomId, ...publicMember } = member;
  return publicMember;
}

export function getRoster(roomId: string, excludeId?: string): Member[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.memberIds)
    .filter((id) => id !== excludeId)
    .map((id) => members.get(id))
    .filter((m): m is InternalMember => m !== undefined)
    .map(toPublicMember);
}

export function updateStatus(id: string, status: { muted?: boolean; sharing?: boolean }): Member | undefined {
  const member = members.get(id);
  if (!member) return undefined;
  if (status.muted !== undefined) member.muted = status.muted;
  if (status.sharing !== undefined) member.sharing = status.sharing;
  return toPublicMember(member);
}

export const DEFAULT_ROOM_ID = "default";

export function ensureDefaultRoom(): void {
  if (rooms.has(DEFAULT_ROOM_ID)) return;
  rooms.set(DEFAULT_ROOM_ID, { id: DEFAULT_ROOM_ID, name: "Sala Geral", passwordHash: null, memberIds: new Set() });
}
