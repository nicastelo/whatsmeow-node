// ── JID ────────────────────────────────────────────
export type JID = string; // e.g. "5989...@s.whatsapp.net" or "1234@g.us"

// ── Messages ───────────────────────────────────────
export interface MessageInfo {
  id: string;
  chat: JID;
  sender: JID;
  isFromMe: boolean;
  isGroup: boolean;
  timestamp: number;
  pushName: string;
}

export interface SendResponse {
  id: string;
  timestamp: number;
}

export interface ContextInfo {
  stanzaId?: string;
  participant?: JID;
  quotedMessage?: Record<string, unknown>;
}

export interface TextMessage {
  conversation: string;
}

export interface ExtendedTextMessage {
  extendedTextMessage: {
    text: string;
    contextInfo?: ContextInfo;
  };
}

export type MessageContent = TextMessage | ExtendedTextMessage;

// ── Groups ─────────────────────────────────────────
export interface GroupParticipant {
  jid: JID;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface GroupInfo {
  jid: JID;
  name: string;
  description?: string;
  owner?: JID;
  announce: boolean;
  locked: boolean;
  ephemeral: boolean;
  participants: GroupParticipant[];
}

// ── Contacts ───────────────────────────────────────
export interface IsOnWhatsAppResult {
  query: string;
  isIn: boolean;
  jid?: JID;
}

export interface UserInfo {
  status: string;
  pictureID: string;
  verifiedName: string;
}

export interface ProfilePicture {
  url: string;
  id: string;
  type: string;
}

// ── Presence ───────────────────────────────────────
export type Presence = "available" | "unavailable";
export type ChatPresence = "composing" | "paused";
export type ChatPresenceMedia = "audio" | "";

// ── Newsletters ────────────────────────────────────
export interface NewsletterInfo {
  id: JID;
  name: string;
}

export interface NewsletterMetadata {
  id: JID;
  state: string;
  name?: string;
  description?: string;
  pictureUrl?: string;
  role?: string;
  mute?: string;
}

export interface NewsletterMessage {
  serverId: number;
  timestamp: number;
  viewsCount: number;
  message?: Record<string, unknown>;
  reactions?: Array<{ reaction: string; count: number }>;
}

// ── Business ───────────────────────────────────────
export interface BusinessProfile {
  jid: JID;
  address?: string;
  email?: string;
  categories?: Array<{ id: string; name: string }>;
  profileOptions?: Record<string, string>;
  businessHoursTimeZone?: string;
  businessHours?: Array<{
    dayOfWeek: string;
    mode: string;
    openTime: string;
    closeTime: string;
  }>;
}

export interface BusinessMessageLinkTarget {
  jid: JID;
  pushName: string;
  message: string;
  isSigned?: boolean;
  verifiedLevel?: string;
  verifiedName?: string;
}

export interface ContactQRLinkTarget {
  jid: JID;
  type: string;
  pushName: string;
}

// ── Privacy ────────────────────────────────────────
export type PrivacySettingAllContactsBlacklistNone =
  | "all"
  | "contacts"
  | "contact_blacklist"
  | "none";
export type PrivacySettingAllNone = "all" | "none";
export type PrivacySettingAllKnown = "all" | "known";
export type PrivacySettingAllMatchLastSeen = "all" | "match_last_seen";
export type PrivacySettingAllContacts = "all" | "contacts";
export type PrivacySettingOnStandardOff = "on_standard" | "off";
export type PrivacySettingContactsAllowlistNone = "contacts" | "contact_allowlist" | "none";

export interface PrivacySettings {
  groupAdd: PrivacySettingAllContactsBlacklistNone;
  lastSeen: PrivacySettingAllContactsBlacklistNone;
  status: PrivacySettingAllContactsBlacklistNone;
  profile: PrivacySettingAllContactsBlacklistNone;
  readReceipts: PrivacySettingAllNone;
  callAdd: PrivacySettingAllKnown;
  online: PrivacySettingAllMatchLastSeen;
  messages: PrivacySettingAllContacts;
  defense: PrivacySettingOnStandardOff;
  stickers: PrivacySettingContactsAllowlistNone;
}

export type StatusPrivacyType = "contacts" | "blacklist" | "whitelist";

export interface StatusPrivacy {
  type: StatusPrivacyType;
  list: JID[];
  isDefault: boolean;
}

// Wire values expected by whatsmeow (NOT camelCase)
export type PrivacySettingName =
  | "groupadd"
  | "last"
  | "status"
  | "profile"
  | "readreceipts"
  | "calladd"
  | "online"
  | "messages"
  | "defense"
  | "stickers";
export type PrivacySettingValue =
  | "all"
  | "contacts"
  | "contact_allowlist"
  | "contact_blacklist"
  | "match_last_seen"
  | "known"
  | "none"
  | "on_standard"
  | "off";

// ── Blocklist ──────────────────────────────────────
export interface Blocklist {
  jids: string[];
}

// ── Upload ─────────────────────────────────────────
export type MediaType = "image" | "video" | "audio" | "document";

export interface UploadResponse {
  URL: string;
  directPath: string;
  mediaKey: string; // base64
  fileEncSHA256: string; // base64
  fileSHA256: string; // base64
  fileLength: number;
}

// ── Groups (extra) ─────────────────────────────────
export interface GroupRequestParticipant {
  jid: JID;
  requestedAt: number;
}

export interface SubGroupInfo {
  jid: JID;
  name: string;
  isDefaultSub: boolean;
}

export type GroupMemberAddMode = "admin_add" | "all_member_add";
export type ParticipantRequestAction = "approve" | "reject";
export type BlocklistAction = "block" | "unblock";

// ── Connection ─────────────────────────────────────
export interface InitResult {
  jid?: JID;
}

// ── Group Info Event ────────────────────────────────
export interface GroupInfoEvent {
  jid: JID;
  name?: string;
  description?: string;
  announce?: boolean;
  locked?: boolean;
  ephemeral?: boolean;
  join?: JID[];
  leave?: JID[];
  promote?: JID[];
  demote?: JID[];
}

// ── Events ─────────────────────────────────────────
export interface WhatsmeowEvents {
  connected: { jid: JID };
  disconnected: Record<string, never>;
  logged_out: { reason: string };
  stream_error: { code: string };
  temporary_ban: { code: string; expire: string };
  keep_alive_timeout: { errorCount: number };
  keep_alive_restored: Record<string, never>;
  message: { info: MessageInfo; message: Record<string, unknown> };
  "message:receipt": {
    type: string;
    chat: JID;
    sender: JID;
    isGroup: boolean;
    ids: string[];
    timestamp: number;
  };
  chat_presence: {
    chat: JID;
    sender: JID;
    state: ChatPresence;
    media: ChatPresenceMedia;
  };
  presence: { jid: JID; presence: Presence; lastSeen?: number };
  "group:info": GroupInfoEvent;
  "group:joined": { jid: JID; name: string };
  picture: { jid: JID; remove: boolean; pictureId?: string };
  "call:offer": { from: JID; callId: string };
  "call:accept": { from: JID; callId: string };
  "call:terminate": { from: JID; callId: string; reason: string };
  identity_change: { jid: JID; timestamp: number };
  history_sync: { type: string };
  qr: { code: string };
  "qr:timeout": null;
  "qr:error": { event: string };
  log: { level: string; msg: string; [key: string]: unknown };
  error: Error;
  exit: { code: number | null };
}

// ── IPC Protocol ───────────────────────────────────
export interface IpcCommand {
  id: string;
  cmd: string;
  args: Record<string, unknown>;
}

export interface IpcResponse {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  code?: string;
}

export interface IpcEvent {
  event: string;
  data?: unknown;
}

// ── Client Options ─────────────────────────────────
export interface ClientOptions {
  store: string;
  binaryPath?: string;
  commandTimeout?: number;
}
