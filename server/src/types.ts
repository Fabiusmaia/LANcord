export type Member = {
  id: string;
  username: string;
  muted: boolean;
  sharing: boolean;
  joinedAt: number;
};

export type ChatMessage = {
  id: string;
  username: string;
  text: string;
  image?: string;
  ts: number;
};

export type SignalKind = "offer" | "answer" | "ice";

export type SignalPayload = {
  to: string;
  kind: SignalKind;
  data: unknown;
};

export type RelayedSignalPayload = {
  from: string;
  kind: SignalKind;
  data: unknown;
};

export type StatusUpdatePayload = {
  muted?: boolean;
  sharing?: boolean;
};

export type MemberStatusPayload = {
  id: string;
  muted?: boolean;
  sharing?: boolean;
};

export interface ClientToServerEvents {
  join: (payload: { username: string }) => void;
  signal: (payload: SignalPayload) => void;
  "status:update": (payload: StatusUpdatePayload) => void;
  "chat:send": (payload: { text: string; image?: string }) => void;
}

export interface ServerToClientEvents {
  welcome: (payload: { self: Member; members: Member[] }) => void;
  "member:joined": (payload: { member: Member }) => void;
  "member:left": (payload: { id: string }) => void;
  "member:status": (payload: MemberStatusPayload) => void;
  signal: (payload: RelayedSignalPayload) => void;
  "chat:message": (payload: ChatMessage) => void;
}
