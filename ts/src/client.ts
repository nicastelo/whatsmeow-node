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
  StatusResult,
  ConnectResult,
  IsOnWhatsAppResult,
  UserInfo,
  ProfilePicture,
  GroupInfo,
  NewsletterInfo,
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

  async connect(): Promise<ConnectResult> {
    this.proc.start();
    return (await this.proc.send("connect", { store: this.store })) as ConnectResult;
  }

  async disconnect(): Promise<void> {
    await this.proc.send("disconnect");
    this.proc.kill();
  }

  async logout(): Promise<void> {
    await this.proc.send("logout");
    this.proc.kill();
  }

  async status(): Promise<StatusResult> {
    return (await this.proc.send("status")) as StatusResult;
  }

  async pairQR(): Promise<void> {
    await this.proc.send("pair:qr");
  }

  async pairCode(phone: string): Promise<string> {
    const result = (await this.proc.send("pair:code", { phone })) as { code: string };
    return result.code;
  }

  // ── Messaging ────────────────────────────────────

  async sendMessage(jid: JID, message: MessageContent): Promise<SendResponse> {
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

  // ── Generic fallback ─────────────────────────────

  async call(method: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return this.proc.send(method, args);
  }
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
