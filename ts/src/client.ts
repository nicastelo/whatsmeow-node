import { EventEmitter } from "node:events";
import { statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { GoProcess } from "./process.js";
import type {
  ClientOptions,
  JID,
  MessageContent,
  SendResponse,
  InitResult,
  IsOnWhatsAppResult,
  UserInfo,
  ProfilePicture,
  GroupInfo,
  NewsletterInfo,
  NewsletterMetadata,
  NewsletterMessage,
  BusinessProfile,
  BusinessMessageLinkTarget,
  ContactQRLinkTarget,
  PrivacySettings,
  StatusPrivacy,
  PrivacySettingName,
  PrivacySettingValue,
  Blocklist,
  MediaType,
  UploadResponse,
  GroupRequestParticipant,
  SubGroupInfo,
  GroupMemberAddMode,
  ParticipantRequestAction,
  BlocklistAction,
  WhatsmeowEvents,
  Presence,
  ChatPresence,
  ChatPresenceMedia,
} from "./types.js";

export class WhatsmeowClient extends EventEmitter {
  private proc: GoProcess;
  private store: string;

  constructor(options: ClientOptions) {
    super();
    this.store = options.store;
    this.proc = new GoProcess(options.binaryPath ?? resolveBinary(), options.commandTimeout);

    // Forward all Go process events to the client
    this.proc.on("connected", (d) => this.emit("connected", d));
    this.proc.on("disconnected", (d) => this.emit("disconnected", d));
    this.proc.on("logged_out", (d) => this.emit("logged_out", d));
    this.proc.on("stream_error", (d) => this.emit("stream_error", d));
    this.proc.on("temporary_ban", (d) => this.emit("temporary_ban", d));
    this.proc.on("keep_alive_timeout", (d) => this.emit("keep_alive_timeout", d));
    this.proc.on("keep_alive_restored", (d) => this.emit("keep_alive_restored", d));
    this.proc.on("message", (d) => this.emit("message", d));
    this.proc.on("message:receipt", (d) => this.emit("message:receipt", d));
    this.proc.on("chat_presence", (d) => this.emit("chat_presence", d));
    this.proc.on("presence", (d) => this.emit("presence", d));
    this.proc.on("group:info", (d) => this.emit("group:info", d));
    this.proc.on("group:joined", (d) => this.emit("group:joined", d));
    this.proc.on("picture", (d) => this.emit("picture", d));
    this.proc.on("call:offer", (d) => this.emit("call:offer", d));
    this.proc.on("call:accept", (d) => this.emit("call:accept", d));
    this.proc.on("call:terminate", (d) => this.emit("call:terminate", d));
    this.proc.on("identity_change", (d) => this.emit("identity_change", d));
    this.proc.on("history_sync", (d) => this.emit("history_sync", d));
    this.proc.on("qr", (d) => this.emit("qr", d));
    this.proc.on("qr:timeout", (d) => this.emit("qr:timeout", d));
    this.proc.on("qr:error", (d) => this.emit("qr:error", d));
    this.proc.on("log", (d) => this.emit("log", d));
    this.proc.on("error", (e) => this.emit("error", e));
    this.proc.on("exit", (d) => this.emit("exit", d));
  }

  // ── Typed event emitter ──────────────────────────

  override on<K extends keyof WhatsmeowEvents>(
    event: K,
    listener: (data: WhatsmeowEvents[K]) => void,
  ): this {
    return super.on(event, listener);
  }

  override once<K extends keyof WhatsmeowEvents>(
    event: K,
    listener: (data: WhatsmeowEvents[K]) => void,
  ): this {
    return super.once(event, listener);
  }

  override emit<K extends keyof WhatsmeowEvents>(event: K, data: WhatsmeowEvents[K]): boolean {
    return super.emit(event, data);
  }

  // ── Connection & Auth ────────────────────────────
  // Maps to: whatsmeow.NewClient() + store setup

  async init(): Promise<InitResult> {
    this.proc.start();
    return (await this.proc.send("init", { store: normalizeStore(this.store) })) as InitResult;
  }

  // Maps to: client.Connect()
  async connect(): Promise<void> {
    await this.proc.send("connect");
  }

  // Maps to: client.Disconnect()
  async disconnect(): Promise<void> {
    await this.proc.send("disconnect");
  }

  // Maps to: client.Logout()
  async logout(): Promise<void> {
    await this.proc.send("logout");
  }

  // Maps to: client.IsConnected()
  async isConnected(): Promise<boolean> {
    const result = (await this.proc.send("isConnected")) as { connected: boolean };
    return result.connected;
  }

  // Maps to: client.IsLoggedIn()
  async isLoggedIn(): Promise<boolean> {
    const result = (await this.proc.send("isLoggedIn")) as { loggedIn: boolean };
    return result.loggedIn;
  }

  // Maps to: client.WaitForConnection()
  async waitForConnection(timeoutMs = 30_000): Promise<boolean> {
    const result = (await this.proc.send("waitForConnection", { timeoutMs })) as {
      connected: boolean;
    };
    return result.connected;
  }

  // Kill the Go subprocess. Called automatically if the Node process exits.
  close(): void {
    this.proc.kill();
  }

  // ── Pairing ────────────────────────────────────────

  // Maps to: client.GetQRChannel() — call before connect()
  async getQRChannel(): Promise<void> {
    await this.proc.send("getQRChannel");
  }

  // Maps to: client.PairPhone() — call after connect()
  async pairCode(phone: string): Promise<string> {
    const result = (await this.proc.send("pairCode", { phone })) as { code: string };
    return result.code;
  }

  // ── Messaging ────────────────────────────────────

  async sendMessage(jid: JID, message: MessageContent): Promise<SendResponse> {
    return (await this.proc.send("sendMessage", {
      jid,
      message,
    })) as SendResponse;
  }

  async sendRawMessage(jid: JID, message: Record<string, unknown>): Promise<SendResponse> {
    return (await this.proc.send("sendMessage", {
      jid,
      message,
    })) as SendResponse;
  }

  async revokeMessage(chat: JID, sender: JID, id: string): Promise<void> {
    await this.proc.send("revokeMessage", { chat, sender, id });
  }

  async markRead(ids: string[], chat: JID, sender?: JID): Promise<void> {
    await this.proc.send("markRead", { ids, chat, sender: sender ?? "" });
  }

  // ── Media ────────────────────────────────────────

  async downloadMedia(msg: {
    directPath: string;
    mediaKey: number[];
    fileSha256: number[];
    fileEncSha256: number[];
    mediaType?: string;
  }): Promise<string> {
    const result = (await this.proc.send("downloadMedia", msg)) as { path: string };
    return result.path;
  }

  // ── Contacts & Users ─────────────────────────────

  async isOnWhatsApp(phones: string[]): Promise<IsOnWhatsAppResult[]> {
    return (await this.proc.send("isOnWhatsApp", { phones })) as IsOnWhatsAppResult[];
  }

  async getUserInfo(jids: JID[]): Promise<Record<string, UserInfo>> {
    return (await this.proc.send("getUserInfo", { jids })) as Record<string, UserInfo>;
  }

  async getProfilePicture(jid: JID): Promise<ProfilePicture> {
    return (await this.proc.send("getProfilePicture", { jid })) as ProfilePicture;
  }

  // ── Groups ───────────────────────────────────────

  async createGroup(name: string, participants: JID[]): Promise<{ jid: JID; name: string }> {
    return (await this.proc.send("createGroup", {
      name,
      participants,
    })) as { jid: JID; name: string };
  }

  async getGroupInfo(jid: JID): Promise<GroupInfo> {
    return (await this.proc.send("getGroupInfo", { jid })) as GroupInfo;
  }

  async getJoinedGroups(): Promise<GroupInfo[]> {
    return (await this.proc.send("getJoinedGroups")) as GroupInfo[];
  }

  async getGroupInviteLink(jid: JID, reset = false): Promise<string> {
    const result = (await this.proc.send("getGroupInviteLink", {
      jid,
      reset,
    })) as { link: string };
    return result.link;
  }

  async joinGroupWithLink(code: string): Promise<JID> {
    const result = (await this.proc.send("joinGroupWithLink", { code })) as { jid: JID };
    return result.jid;
  }

  async leaveGroup(jid: JID): Promise<void> {
    await this.proc.send("leaveGroup", { jid });
  }

  async setGroupName(jid: JID, name: string): Promise<void> {
    await this.proc.send("setGroupName", { jid, name });
  }

  async setGroupTopic(jid: JID, topic: string, previousId = "", newId = ""): Promise<void> {
    await this.proc.send("setGroupTopic", { jid, topic, previousId, newId });
  }

  async setGroupPhoto(jid: JID, path: string): Promise<string> {
    const result = (await this.proc.send("setGroupPhoto", {
      jid,
      path,
    })) as { pictureId: string };
    return result.pictureId;
  }

  async setGroupAnnounce(jid: JID, announce: boolean): Promise<void> {
    await this.proc.send("setGroupAnnounce", { jid, announce });
  }

  async setGroupLocked(jid: JID, locked: boolean): Promise<void> {
    await this.proc.send("setGroupLocked", { jid, locked });
  }

  async updateGroupParticipants(
    jid: JID,
    participants: JID[],
    action: "add" | "remove" | "promote" | "demote",
  ): Promise<void> {
    await this.proc.send("updateGroupParticipants", {
      jid,
      participants,
      action,
    });
  }

  // ── Presence ─────────────────────────────────────

  async sendPresence(presence: Presence): Promise<void> {
    await this.proc.send("sendPresence", { presence });
  }

  async sendChatPresence(
    jid: JID,
    presence: ChatPresence,
    media: ChatPresenceMedia = "",
  ): Promise<void> {
    await this.proc.send("sendChatPresence", { jid, presence, media });
  }

  async subscribePresence(jid: JID): Promise<void> {
    await this.proc.send("subscribePresence", { jid });
  }

  // ── Newsletters ──────────────────────────────────

  async getSubscribedNewsletters(): Promise<NewsletterInfo[]> {
    return (await this.proc.send("getSubscribedNewsletters")) as NewsletterInfo[];
  }

  async newsletterSubscribeLiveUpdates(jid: JID): Promise<number> {
    const result = (await this.proc.send("newsletterSubscribeLiveUpdates", {
      jid,
    })) as { durationMs: number };
    return result.durationMs;
  }

  // ── Calls ────────────────────────────────────────

  async rejectCall(from: JID, callId: string): Promise<void> {
    await this.proc.send("rejectCall", { from, callId });
  }

  // ── Message Operations (extra) ──────────────────

  async sendReaction(chat: JID, sender: JID, id: string, reaction: string): Promise<SendResponse> {
    return (await this.proc.send("sendReaction", { chat, sender, id, reaction })) as SendResponse;
  }

  async editMessage(chat: JID, id: string, message: MessageContent): Promise<SendResponse> {
    return (await this.proc.send("editMessage", { chat, id, message })) as SendResponse;
  }

  async sendPollCreation(
    jid: JID,
    name: string,
    options: string[],
    selectableCount: number,
  ): Promise<SendResponse> {
    return (await this.proc.send("sendPollCreation", {
      jid,
      name,
      options,
      selectableCount,
    })) as SendResponse;
  }

  async sendPollVote(
    pollChat: JID,
    pollSender: JID,
    pollId: string,
    pollTimestamp: number,
    options: string[],
  ): Promise<SendResponse> {
    return (await this.proc.send("sendPollVote", {
      pollChat,
      pollSender,
      pollId,
      pollTimestamp,
      options,
    })) as SendResponse;
  }

  // ── Advanced Groups ─────────────────────────────

  async setGroupDescription(jid: JID, description: string): Promise<void> {
    await this.proc.send("setGroupDescription", { jid, description });
  }

  async getGroupInfoFromLink(code: string): Promise<GroupInfo> {
    return (await this.proc.send("getGroupInfoFromLink", { code })) as GroupInfo;
  }

  async getGroupRequestParticipants(jid: JID): Promise<GroupRequestParticipant[]> {
    return (await this.proc.send("getGroupRequestParticipants", {
      jid,
    })) as GroupRequestParticipant[];
  }

  async updateGroupRequestParticipants(
    jid: JID,
    participants: JID[],
    action: ParticipantRequestAction,
  ): Promise<void> {
    await this.proc.send("updateGroupRequestParticipants", { jid, participants, action });
  }

  async setGroupMemberAddMode(jid: JID, mode: GroupMemberAddMode): Promise<void> {
    await this.proc.send("setGroupMemberAddMode", { jid, mode });
  }

  async setGroupJoinApprovalMode(jid: JID, enabled: boolean): Promise<void> {
    await this.proc.send("setGroupJoinApprovalMode", { jid, enabled });
  }

  async linkGroup(parent: JID, child: JID): Promise<void> {
    await this.proc.send("linkGroup", { parent, child });
  }

  async unlinkGroup(parent: JID, child: JID): Promise<void> {
    await this.proc.send("unlinkGroup", { parent, child });
  }

  async getSubGroups(jid: JID): Promise<SubGroupInfo[]> {
    return (await this.proc.send("getSubGroups", { jid })) as SubGroupInfo[];
  }

  async getLinkedGroupsParticipants(jid: JID): Promise<string[]> {
    return (await this.proc.send("getLinkedGroupsParticipants", { jid })) as string[];
  }

  // ── Newsletter Operations (extra) ───────────────

  async createNewsletter(
    name: string,
    description: string,
    picture?: string,
  ): Promise<{ id: JID; name: string }> {
    return (await this.proc.send("createNewsletter", {
      name,
      description,
      picture: picture ?? "",
    })) as { id: JID; name: string };
  }

  async getNewsletterInfo(jid: JID): Promise<NewsletterMetadata> {
    return (await this.proc.send("getNewsletterInfo", { jid })) as NewsletterMetadata;
  }

  async getNewsletterInfoWithInvite(key: string): Promise<NewsletterMetadata> {
    return (await this.proc.send("getNewsletterInfoWithInvite", { key })) as NewsletterMetadata;
  }

  async followNewsletter(jid: JID): Promise<void> {
    await this.proc.send("followNewsletter", { jid });
  }

  async unfollowNewsletter(jid: JID): Promise<void> {
    await this.proc.send("unfollowNewsletter", { jid });
  }

  async getNewsletterMessages(jid: JID, count: number, before = 0): Promise<NewsletterMessage[]> {
    return (await this.proc.send("getNewsletterMessages", {
      jid,
      count,
      before,
    })) as NewsletterMessage[];
  }

  async newsletterMarkViewed(jid: JID, serverIds: number[]): Promise<void> {
    await this.proc.send("newsletterMarkViewed", { jid, serverIds });
  }

  async newsletterSendReaction(
    jid: JID,
    serverId: number,
    reaction: string,
    messageId: string,
  ): Promise<void> {
    await this.proc.send("newsletterSendReaction", { jid, serverId, reaction, messageId });
  }

  async newsletterToggleMute(jid: JID, mute: boolean): Promise<void> {
    await this.proc.send("newsletterToggleMute", { jid, mute });
  }

  // ── User & Contact Operations (extra) ───────────

  async getUserDevices(jids: JID[]): Promise<string[]> {
    return (await this.proc.send("getUserDevices", { jids })) as string[];
  }

  async getBusinessProfile(jid: JID): Promise<BusinessProfile> {
    return (await this.proc.send("getBusinessProfile", { jid })) as BusinessProfile;
  }

  async setStatusMessage(message: string): Promise<void> {
    await this.proc.send("setStatusMessage", { message });
  }

  // ── Privacy & Settings ──────────────────────────

  async getPrivacySettings(): Promise<PrivacySettings> {
    return (await this.proc.send("getPrivacySettings")) as PrivacySettings;
  }

  async tryFetchPrivacySettings(ignoreCache = false): Promise<PrivacySettings> {
    return (await this.proc.send("tryFetchPrivacySettings", { ignoreCache })) as PrivacySettings;
  }

  async setPrivacySetting(
    name: PrivacySettingName,
    value: PrivacySettingValue,
  ): Promise<PrivacySettings> {
    return (await this.proc.send("setPrivacySetting", { name, value })) as PrivacySettings;
  }

  async getStatusPrivacy(): Promise<StatusPrivacy[]> {
    return (await this.proc.send("getStatusPrivacy")) as StatusPrivacy[];
  }

  async setDefaultDisappearingTimer(seconds: number): Promise<void> {
    await this.proc.send("setDefaultDisappearingTimer", { seconds });
  }

  async setDisappearingTimer(jid: JID, seconds: number): Promise<void> {
    await this.proc.send("setDisappearingTimer", { jid, seconds });
  }

  // ── Blocklist ───────────────────────────────────

  async getBlocklist(): Promise<Blocklist> {
    return (await this.proc.send("getBlocklist")) as Blocklist;
  }

  async updateBlocklist(jid: JID, action: BlocklistAction): Promise<Blocklist> {
    return (await this.proc.send("updateBlocklist", { jid, action })) as Blocklist;
  }

  // ── QR & Link Resolution ────────────────────────

  async getContactQRLink(revoke = false): Promise<string> {
    const result = (await this.proc.send("getContactQRLink", { revoke })) as { link: string };
    return result.link;
  }

  async resolveContactQRLink(code: string): Promise<ContactQRLinkTarget> {
    return (await this.proc.send("resolveContactQRLink", { code })) as ContactQRLinkTarget;
  }

  async resolveBusinessMessageLink(code: string): Promise<BusinessMessageLinkTarget> {
    return (await this.proc.send("resolveBusinessMessageLink", {
      code,
    })) as BusinessMessageLinkTarget;
  }

  // ── Media Upload ────────────────────────────────

  async uploadMedia(path: string, mediaType: MediaType): Promise<UploadResponse> {
    return (await this.proc.send("uploadMedia", { path, mediaType })) as UploadResponse;
  }

  // ── Configuration ───────────────────────────────

  async setPassive(passive: boolean): Promise<void> {
    await this.proc.send("setPassive", { passive });
  }

  async setForceActiveDeliveryReceipts(active: boolean): Promise<void> {
    await this.proc.send("setForceActiveDeliveryReceipts", { active });
  }

  // ── Generic fallback ─────────────────────────────

  async call(method: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return this.proc.send(method, args);
  }
}

function normalizeStore(store: string): string {
  // Already a connection string
  if (
    store.startsWith("file:") ||
    store.startsWith("postgres://") ||
    store.startsWith("postgresql://")
  ) {
    return store;
  }
  // Plain file path — wrap as SQLite URI
  return `file:${store}`;
}

const BINARY_NAME = process.platform === "win32" ? "whatsmeow-node.exe" : "whatsmeow-node";

function resolveBinary(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url));

  // Try local binary first (dev mode — binary at repo root)
  const localBin = resolve(thisDir, "../../whatsmeow-node");
  try {
    if (statSync(localBin).isFile()) return localBin;
  } catch {
    // not found — fall through to platform package
  }

  // Try platform-specific npm package
  const require = createRequire(import.meta.url);
  const pkgName = `@whatsmeow-node/${process.platform}-${process.arch}`;
  try {
    return require.resolve(`${pkgName}/bin/${BINARY_NAME}`);
  } catch {
    throw new Error(
      `Could not find whatsmeow-node binary. Install ${pkgName} or set binaryPath option.`,
    );
  }
}
