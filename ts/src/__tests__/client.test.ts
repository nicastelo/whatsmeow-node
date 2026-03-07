import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before imports, safe to use in vi.mock factories
const { MockGoProcess } = vi.hoisted(() => {
  // Inline minimal EventEmitter — node:events can't be imported here
  type Listener = (...args: unknown[]) => void;
  class MinimalEmitter {
    private _listeners: Record<string, Listener[]> = {};
    on(event: string, fn: Listener) {
      (this._listeners[event] ??= []).push(fn);
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      for (const fn of this._listeners[event] ?? []) fn(...args);
      return true;
    }
    removeAllListeners() {
      this._listeners = {};
      return this;
    }
  }

  class MockGoProcess extends MinimalEmitter {
    send = vi.fn();
    start = vi.fn();
    kill = vi.fn();
    get alive() {
      return true;
    }
  }

  return { MockGoProcess };
});

vi.mock("../process.js", () => ({ GoProcess: MockGoProcess }));

// Mock resolveBinary (statSync)
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    statSync: vi.fn(() => ({ isFile: () => true })),
  };
});

import { WhatsmeowClient } from "../client.js";

function createTestClient() {
  const client = new WhatsmeowClient({
    store: "test.db",
    binaryPath: "/fake/binary",
  });
  const proc = (client as unknown as { proc: { send: ReturnType<typeof vi.fn> } }).proc;
  return { client, send: proc.send };
}

// Helper: set up send mock to resolve with given data
function mockResolve(send: ReturnType<typeof vi.fn>, data: unknown = null) {
  send.mockResolvedValueOnce(data);
}

describe("WhatsmeowClient", () => {
  let client: WhatsmeowClient;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ client, send } = createTestClient());
  });

  // ── Connection & Auth ──────────────────────────

  describe("connection", () => {
    it("init sends init with normalized store", async () => {
      mockResolve(send, { jid: "123@s.whatsapp.net" });
      const result = await client.init();
      expect(send).toHaveBeenCalledWith("init", { store: "file:test.db" });
      expect(result).toEqual({ jid: "123@s.whatsapp.net" });
    });

    it("connect sends connect", async () => {
      mockResolve(send);
      await client.connect();
      expect(send).toHaveBeenCalledWith("connect");
    });

    it("disconnect sends disconnect", async () => {
      mockResolve(send);
      await client.disconnect();
      expect(send).toHaveBeenCalledWith("disconnect");
    });

    it("logout sends logout", async () => {
      mockResolve(send);
      await client.logout();
      expect(send).toHaveBeenCalledWith("logout");
    });

    it("isConnected extracts connected boolean", async () => {
      mockResolve(send, { connected: true });
      expect(await client.isConnected()).toBe(true);
      expect(send).toHaveBeenCalledWith("isConnected");
    });

    it("isLoggedIn extracts loggedIn boolean", async () => {
      mockResolve(send, { loggedIn: false });
      expect(await client.isLoggedIn()).toBe(false);
      expect(send).toHaveBeenCalledWith("isLoggedIn");
    });

    it("waitForConnection sends timeoutMs and extracts connected", async () => {
      mockResolve(send, { connected: true });
      const connected = await client.waitForConnection(5000);
      expect(send).toHaveBeenCalledWith("waitForConnection", { timeoutMs: 5000 });
      expect(connected).toBe(true);
    });

    it("waitForConnection defaults timeoutMs to 30000", async () => {
      mockResolve(send, { connected: false });
      const connected = await client.waitForConnection();
      expect(send).toHaveBeenCalledWith("waitForConnection", { timeoutMs: 30000 });
      expect(connected).toBe(false);
    });
  });

  // ── Pairing ────────────────────────────────────

  describe("pairing", () => {
    it("getQRChannel sends getQRChannel", async () => {
      mockResolve(send);
      await client.getQRChannel();
      expect(send).toHaveBeenCalledWith("getQRChannel");
    });

    it("pairCode sends phone and extracts code", async () => {
      mockResolve(send, { code: "1234-5678" });
      const code = await client.pairCode("+598123456");
      expect(send).toHaveBeenCalledWith("pairCode", { phone: "+598123456" });
      expect(code).toBe("1234-5678");
    });
  });

  // ── Messaging ──────────────────────────────────

  describe("messaging", () => {
    it("sendMessage sends jid and message", async () => {
      mockResolve(send, { id: "msg1", timestamp: 1000 });
      const result = await client.sendMessage("123@s.whatsapp.net", {
        conversation: "hello",
      });
      expect(send).toHaveBeenCalledWith("sendMessage", {
        jid: "123@s.whatsapp.net",
        message: { conversation: "hello" },
      });
      expect(result).toEqual({ id: "msg1", timestamp: 1000 });
    });

    it("sendRawMessage sends via sendMessage command", async () => {
      mockResolve(send, { id: "msg2", timestamp: 2000 });
      await client.sendRawMessage("123@s.whatsapp.net", {
        imageMessage: { url: "https://example.com/img.jpg" },
      });
      expect(send).toHaveBeenCalledWith("sendMessage", {
        jid: "123@s.whatsapp.net",
        message: { imageMessage: { url: "https://example.com/img.jpg" } },
      });
    });

    it("revokeMessage sends chat, sender, id", async () => {
      mockResolve(send);
      await client.revokeMessage("chat@g.us", "sender@s.whatsapp.net", "msgid");
      expect(send).toHaveBeenCalledWith("revokeMessage", {
        chat: "chat@g.us",
        sender: "sender@s.whatsapp.net",
        id: "msgid",
      });
    });

    it("markRead sends ids, chat, and defaults sender to empty", async () => {
      mockResolve(send);
      await client.markRead(["id1", "id2"], "chat@g.us");
      expect(send).toHaveBeenCalledWith("markRead", {
        ids: ["id1", "id2"],
        chat: "chat@g.us",
        sender: "",
      });
    });

    it("markRead passes sender when provided", async () => {
      mockResolve(send);
      await client.markRead(["id1"], "chat@g.us", "sender@s.whatsapp.net");
      expect(send).toHaveBeenCalledWith("markRead", {
        ids: ["id1"],
        chat: "chat@g.us",
        sender: "sender@s.whatsapp.net",
      });
    });
  });

  // ── Message Operations (extra) ─────────────────

  describe("message operations", () => {
    it("sendReaction sends chat, sender, id, reaction", async () => {
      mockResolve(send, { id: "r1", timestamp: 100 });
      const result = await client.sendReaction("chat@g.us", "sender@s.whatsapp.net", "msgid", "👍");
      expect(send).toHaveBeenCalledWith("sendReaction", {
        chat: "chat@g.us",
        sender: "sender@s.whatsapp.net",
        id: "msgid",
        reaction: "👍",
      });
      expect(result.id).toBe("r1");
    });

    it("sendReaction with empty string removes reaction", async () => {
      mockResolve(send, { id: "r2", timestamp: 100 });
      await client.sendReaction("chat@g.us", "sender@s.whatsapp.net", "msgid", "");
      expect(send).toHaveBeenCalledWith("sendReaction", {
        chat: "chat@g.us",
        sender: "sender@s.whatsapp.net",
        id: "msgid",
        reaction: "",
      });
    });

    it("editMessage sends chat, id, message", async () => {
      mockResolve(send, { id: "e1", timestamp: 200 });
      await client.editMessage("chat@g.us", "msgid", { conversation: "edited" });
      expect(send).toHaveBeenCalledWith("editMessage", {
        chat: "chat@g.us",
        id: "msgid",
        message: { conversation: "edited" },
      });
    });

    it("sendPollCreation sends all poll params", async () => {
      mockResolve(send, { id: "p1", timestamp: 300 });
      await client.sendPollCreation("chat@g.us", "Favorite color?", ["Red", "Blue", "Green"], 1);
      expect(send).toHaveBeenCalledWith("sendPollCreation", {
        jid: "chat@g.us",
        name: "Favorite color?",
        options: ["Red", "Blue", "Green"],
        selectableCount: 1,
      });
    });

    it("sendPollVote sends poll info and selected options", async () => {
      mockResolve(send, { id: "v1", timestamp: 400 });
      await client.sendPollVote("chat@g.us", "sender@s.whatsapp.net", "pollid", 12345, ["Red"]);
      expect(send).toHaveBeenCalledWith("sendPollVote", {
        pollChat: "chat@g.us",
        pollSender: "sender@s.whatsapp.net",
        pollId: "pollid",
        pollTimestamp: 12345,
        options: ["Red"],
      });
    });
  });

  // ── Media ──────────────────────────────────────

  describe("media", () => {
    it("downloadMedia sends msg params and extracts path", async () => {
      mockResolve(send, { path: "/tmp/file123" });
      const msg = {
        directPath: "/enc/path",
        mediaKey: [1, 2, 3],
        fileSha256: [4, 5, 6],
        fileEncSha256: [7, 8, 9],
      };
      const result = await client.downloadMedia(msg);
      expect(send).toHaveBeenCalledWith("downloadMedia", msg);
      expect(result).toBe("/tmp/file123");
    });

    it("uploadMedia sends path and mediaType", async () => {
      const uploadResp = {
        URL: "https://mmg.whatsapp.net/...",
        directPath: "/v/...",
        mediaKey: "AQID", // base64 for [1,2,3]
        fileEncSHA256: "BAUG",
        fileSHA256: "BwgJ",
        fileLength: 1024,
      };
      mockResolve(send, uploadResp);
      const result = await client.uploadMedia("/path/to/image.jpg", "image");
      expect(send).toHaveBeenCalledWith("uploadMedia", {
        path: "/path/to/image.jpg",
        mediaType: "image",
      });
      expect(result).toEqual(uploadResp);
    });
  });

  // ── Contacts & Users ───────────────────────────

  describe("contacts & users", () => {
    it("isOnWhatsApp sends phones array", async () => {
      mockResolve(send, [{ query: "+598123", isIn: true, jid: "598123@s.whatsapp.net" }]);
      const result = await client.isOnWhatsApp(["+598123"]);
      expect(send).toHaveBeenCalledWith("isOnWhatsApp", { phones: ["+598123"] });
      expect(result[0].isIn).toBe(true);
    });

    it("getUserInfo sends jids", async () => {
      mockResolve(send, {
        "123@s.whatsapp.net": { status: "hey", pictureID: "", verifiedName: "" },
      });
      await client.getUserInfo(["123@s.whatsapp.net"]);
      expect(send).toHaveBeenCalledWith("getUserInfo", { jids: ["123@s.whatsapp.net"] });
    });

    it("getProfilePicture sends jid", async () => {
      mockResolve(send, { url: "https://pps.whatsapp.net/...", id: "pic1", type: "image" });
      await client.getProfilePicture("123@s.whatsapp.net");
      expect(send).toHaveBeenCalledWith("getProfilePicture", { jid: "123@s.whatsapp.net" });
    });

    it("getUserDevices sends jids array", async () => {
      mockResolve(send, ["123:0@s.whatsapp.net", "123:1@s.whatsapp.net"]);
      const result = await client.getUserDevices(["123@s.whatsapp.net"]);
      expect(send).toHaveBeenCalledWith("getUserDevices", { jids: ["123@s.whatsapp.net"] });
      expect(result).toHaveLength(2);
    });

    it("getBusinessProfile sends jid", async () => {
      mockResolve(send, {
        jid: "biz@s.whatsapp.net",
        address: "123 Main St",
        profileOptions: { cart_enabled: "true" },
        businessHoursTimeZone: "America/Montevideo",
        businessHours: [
          { dayOfWeek: "monday", mode: "open", openTime: "09:00", closeTime: "18:00" },
        ],
      });
      const result = await client.getBusinessProfile("biz@s.whatsapp.net");
      expect(send).toHaveBeenCalledWith("getBusinessProfile", { jid: "biz@s.whatsapp.net" });
      expect(result.address).toBe("123 Main St");
      expect(result.profileOptions?.cart_enabled).toBe("true");
      expect(result.businessHours?.[0]?.dayOfWeek).toBe("monday");
    });

    it("setStatusMessage sends message", async () => {
      mockResolve(send);
      await client.setStatusMessage("Available");
      expect(send).toHaveBeenCalledWith("setStatusMessage", { message: "Available" });
    });
  });

  // ── Groups ─────────────────────────────────────

  describe("groups", () => {
    it("createGroup sends name and participants", async () => {
      mockResolve(send, { jid: "group@g.us", name: "Test Group" });
      await client.createGroup("Test Group", ["a@s.whatsapp.net"]);
      expect(send).toHaveBeenCalledWith("createGroup", {
        name: "Test Group",
        participants: ["a@s.whatsapp.net"],
      });
    });

    it("getGroupInfo sends jid", async () => {
      mockResolve(send, { jid: "g@g.us", name: "G", participants: [] });
      await client.getGroupInfo("g@g.us");
      expect(send).toHaveBeenCalledWith("getGroupInfo", { jid: "g@g.us" });
    });

    it("getJoinedGroups sends no args", async () => {
      mockResolve(send, []);
      await client.getJoinedGroups();
      expect(send).toHaveBeenCalledWith("getJoinedGroups");
    });

    it("getGroupInviteLink sends jid and reset defaults to false", async () => {
      mockResolve(send, { link: "https://chat.whatsapp.com/abc" });
      const link = await client.getGroupInviteLink("g@g.us");
      expect(send).toHaveBeenCalledWith("getGroupInviteLink", { jid: "g@g.us", reset: false });
      expect(link).toBe("https://chat.whatsapp.com/abc");
    });

    it("getGroupInviteLink with reset=true", async () => {
      mockResolve(send, { link: "https://chat.whatsapp.com/new" });
      await client.getGroupInviteLink("g@g.us", true);
      expect(send).toHaveBeenCalledWith("getGroupInviteLink", { jid: "g@g.us", reset: true });
    });

    it("joinGroupWithLink sends code and extracts jid", async () => {
      mockResolve(send, { jid: "joined@g.us" });
      const jid = await client.joinGroupWithLink("abc123");
      expect(send).toHaveBeenCalledWith("joinGroupWithLink", { code: "abc123" });
      expect(jid).toBe("joined@g.us");
    });

    it("leaveGroup sends jid", async () => {
      mockResolve(send);
      await client.leaveGroup("g@g.us");
      expect(send).toHaveBeenCalledWith("leaveGroup", { jid: "g@g.us" });
    });

    it("setGroupName sends jid and name", async () => {
      mockResolve(send);
      await client.setGroupName("g@g.us", "New Name");
      expect(send).toHaveBeenCalledWith("setGroupName", { jid: "g@g.us", name: "New Name" });
    });

    it("setGroupTopic sends jid/topic with default IDs", async () => {
      mockResolve(send);
      await client.setGroupTopic("g@g.us", "New topic");
      expect(send).toHaveBeenCalledWith("setGroupTopic", {
        jid: "g@g.us",
        topic: "New topic",
        previousId: "",
        newId: "",
      });
    });

    it("setGroupTopic sends explicit previousId/newId", async () => {
      mockResolve(send);
      await client.setGroupTopic("g@g.us", "New topic", "prev123", "new123");
      expect(send).toHaveBeenCalledWith("setGroupTopic", {
        jid: "g@g.us",
        topic: "New topic",
        previousId: "prev123",
        newId: "new123",
      });
    });

    it("setGroupDescription sends jid and description", async () => {
      mockResolve(send);
      await client.setGroupDescription("g@g.us", "A description");
      expect(send).toHaveBeenCalledWith("setGroupDescription", {
        jid: "g@g.us",
        description: "A description",
      });
    });

    it("setGroupPhoto sends jid and path, extracts pictureId", async () => {
      mockResolve(send, { pictureId: "pic123" });
      const id = await client.setGroupPhoto("g@g.us", "/path/photo.jpg");
      expect(send).toHaveBeenCalledWith("setGroupPhoto", {
        jid: "g@g.us",
        path: "/path/photo.jpg",
      });
      expect(id).toBe("pic123");
    });

    it("setGroupAnnounce sends jid and boolean", async () => {
      mockResolve(send);
      await client.setGroupAnnounce("g@g.us", true);
      expect(send).toHaveBeenCalledWith("setGroupAnnounce", { jid: "g@g.us", announce: true });
    });

    it("setGroupLocked sends jid and boolean", async () => {
      mockResolve(send);
      await client.setGroupLocked("g@g.us", false);
      expect(send).toHaveBeenCalledWith("setGroupLocked", { jid: "g@g.us", locked: false });
    });

    it("updateGroupParticipants sends all actions", async () => {
      for (const action of ["add", "remove", "promote", "demote"] as const) {
        send.mockResolvedValueOnce(null);
        await client.updateGroupParticipants("g@g.us", ["a@s.whatsapp.net"], action);
        expect(send).toHaveBeenCalledWith("updateGroupParticipants", {
          jid: "g@g.us",
          participants: ["a@s.whatsapp.net"],
          action,
        });
      }
    });

    it("getGroupInfoFromLink sends code", async () => {
      mockResolve(send, { jid: "g@g.us", name: "G", participants: [] });
      await client.getGroupInfoFromLink("abc123");
      expect(send).toHaveBeenCalledWith("getGroupInfoFromLink", { code: "abc123" });
    });

    it("getGroupRequestParticipants sends jid", async () => {
      mockResolve(send, [{ jid: "req@s.whatsapp.net", requestedAt: 1000 }]);
      const result = await client.getGroupRequestParticipants("g@g.us");
      expect(send).toHaveBeenCalledWith("getGroupRequestParticipants", { jid: "g@g.us" });
      expect(result[0].requestedAt).toBe(1000);
    });

    it("updateGroupRequestParticipants sends approve/reject", async () => {
      mockResolve(send);
      await client.updateGroupRequestParticipants("g@g.us", ["a@s.whatsapp.net"], "approve");
      expect(send).toHaveBeenCalledWith("updateGroupRequestParticipants", {
        jid: "g@g.us",
        participants: ["a@s.whatsapp.net"],
        action: "approve",
      });
    });

    it("setGroupMemberAddMode sends jid and mode", async () => {
      mockResolve(send);
      await client.setGroupMemberAddMode("g@g.us", "admin_add");
      expect(send).toHaveBeenCalledWith("setGroupMemberAddMode", {
        jid: "g@g.us",
        mode: "admin_add",
      });
    });

    it("setGroupJoinApprovalMode sends jid and enabled", async () => {
      mockResolve(send);
      await client.setGroupJoinApprovalMode("g@g.us", true);
      expect(send).toHaveBeenCalledWith("setGroupJoinApprovalMode", {
        jid: "g@g.us",
        enabled: true,
      });
    });
  });

  // ── Communities ─────────────────────────────────

  describe("communities", () => {
    it("linkGroup sends parent and child", async () => {
      mockResolve(send);
      await client.linkGroup("parent@g.us", "child@g.us");
      expect(send).toHaveBeenCalledWith("linkGroup", {
        parent: "parent@g.us",
        child: "child@g.us",
      });
    });

    it("unlinkGroup sends parent and child", async () => {
      mockResolve(send);
      await client.unlinkGroup("parent@g.us", "child@g.us");
      expect(send).toHaveBeenCalledWith("unlinkGroup", {
        parent: "parent@g.us",
        child: "child@g.us",
      });
    });

    it("getSubGroups sends jid", async () => {
      mockResolve(send, [{ jid: "sub@g.us", name: "Sub", isDefaultSub: false }]);
      const result = await client.getSubGroups("parent@g.us");
      expect(send).toHaveBeenCalledWith("getSubGroups", { jid: "parent@g.us" });
      expect(result[0].name).toBe("Sub");
    });

    it("getLinkedGroupsParticipants sends jid", async () => {
      mockResolve(send, ["a@s.whatsapp.net", "b@s.whatsapp.net"]);
      const result = await client.getLinkedGroupsParticipants("parent@g.us");
      expect(send).toHaveBeenCalledWith("getLinkedGroupsParticipants", { jid: "parent@g.us" });
      expect(result).toHaveLength(2);
    });
  });

  // ── Presence ───────────────────────────────────

  describe("presence", () => {
    it("sendPresence sends presence string", async () => {
      mockResolve(send);
      await client.sendPresence("available");
      expect(send).toHaveBeenCalledWith("sendPresence", { presence: "available" });
    });

    it("sendChatPresence sends jid, presence, defaults media to empty", async () => {
      mockResolve(send);
      await client.sendChatPresence("chat@g.us", "composing");
      expect(send).toHaveBeenCalledWith("sendChatPresence", {
        jid: "chat@g.us",
        presence: "composing",
        media: "",
      });
    });

    it("sendChatPresence passes media when provided", async () => {
      mockResolve(send);
      await client.sendChatPresence("chat@g.us", "composing", "audio");
      expect(send).toHaveBeenCalledWith("sendChatPresence", {
        jid: "chat@g.us",
        presence: "composing",
        media: "audio",
      });
    });

    it("subscribePresence sends jid", async () => {
      mockResolve(send);
      await client.subscribePresence("user@s.whatsapp.net");
      expect(send).toHaveBeenCalledWith("subscribePresence", { jid: "user@s.whatsapp.net" });
    });
  });

  // ── Newsletters ────────────────────────────────

  describe("newsletters", () => {
    it("getSubscribedNewsletters sends no args", async () => {
      mockResolve(send, []);
      await client.getSubscribedNewsletters();
      expect(send).toHaveBeenCalledWith("getSubscribedNewsletters");
    });

    it("newsletterSubscribeLiveUpdates extracts durationMs", async () => {
      mockResolve(send, { durationMs: 60000 });
      const duration = await client.newsletterSubscribeLiveUpdates("nl@newsletter");
      expect(send).toHaveBeenCalledWith("newsletterSubscribeLiveUpdates", { jid: "nl@newsletter" });
      expect(duration).toBe(60000);
    });

    it("createNewsletter sends name, description, defaults picture to empty", async () => {
      mockResolve(send, { id: "nl@newsletter", name: "My Newsletter" });
      await client.createNewsletter("My Newsletter", "A description");
      expect(send).toHaveBeenCalledWith("createNewsletter", {
        name: "My Newsletter",
        description: "A description",
        picture: "",
      });
    });

    it("createNewsletter passes picture when provided", async () => {
      mockResolve(send, { id: "nl@newsletter", name: "NL" });
      await client.createNewsletter("NL", "desc", "/path/pic.jpg");
      expect(send).toHaveBeenCalledWith("createNewsletter", {
        name: "NL",
        description: "desc",
        picture: "/path/pic.jpg",
      });
    });

    it("getNewsletterInfo sends jid", async () => {
      mockResolve(send, { id: "nl@newsletter", state: "active" });
      await client.getNewsletterInfo("nl@newsletter");
      expect(send).toHaveBeenCalledWith("getNewsletterInfo", { jid: "nl@newsletter" });
    });

    it("getNewsletterInfoWithInvite sends key", async () => {
      mockResolve(send, { id: "nl@newsletter", state: "active" });
      await client.getNewsletterInfoWithInvite("invite-key-123");
      expect(send).toHaveBeenCalledWith("getNewsletterInfoWithInvite", { key: "invite-key-123" });
    });

    it("followNewsletter sends jid", async () => {
      mockResolve(send);
      await client.followNewsletter("nl@newsletter");
      expect(send).toHaveBeenCalledWith("followNewsletter", { jid: "nl@newsletter" });
    });

    it("unfollowNewsletter sends jid", async () => {
      mockResolve(send);
      await client.unfollowNewsletter("nl@newsletter");
      expect(send).toHaveBeenCalledWith("unfollowNewsletter", { jid: "nl@newsletter" });
    });

    it("getNewsletterMessages sends jid, count, defaults before to 0", async () => {
      mockResolve(send, []);
      await client.getNewsletterMessages("nl@newsletter", 10);
      expect(send).toHaveBeenCalledWith("getNewsletterMessages", {
        jid: "nl@newsletter",
        count: 10,
        before: 0,
      });
    });

    it("getNewsletterMessages passes before for backward pagination", async () => {
      mockResolve(send, []);
      await client.getNewsletterMessages("nl@newsletter", 10, 500);
      expect(send).toHaveBeenCalledWith("getNewsletterMessages", {
        jid: "nl@newsletter",
        count: 10,
        before: 500,
      });
    });

    it("newsletterMarkViewed sends jid and serverIds", async () => {
      mockResolve(send);
      await client.newsletterMarkViewed("nl@newsletter", [1, 2, 3]);
      expect(send).toHaveBeenCalledWith("newsletterMarkViewed", {
        jid: "nl@newsletter",
        serverIds: [1, 2, 3],
      });
    });

    it("newsletterSendReaction sends all params", async () => {
      mockResolve(send);
      await client.newsletterSendReaction("nl@newsletter", 42, "👍", "msgid");
      expect(send).toHaveBeenCalledWith("newsletterSendReaction", {
        jid: "nl@newsletter",
        serverId: 42,
        reaction: "👍",
        messageId: "msgid",
      });
    });

    it("newsletterToggleMute sends jid and mute boolean", async () => {
      mockResolve(send);
      await client.newsletterToggleMute("nl@newsletter", true);
      expect(send).toHaveBeenCalledWith("newsletterToggleMute", {
        jid: "nl@newsletter",
        mute: true,
      });
    });
  });

  // ── Privacy & Settings ─────────────────────────

  describe("privacy & settings", () => {
    it("getPrivacySettings sends no args", async () => {
      const settings = {
        groupAdd: "all",
        lastSeen: "contacts",
        status: "all",
        profile: "all",
        readReceipts: "all",
        callAdd: "all",
        online: "all",
        messages: "all",
        defense: "on_standard",
        stickers: "contacts",
      };
      mockResolve(send, settings);
      const result = await client.getPrivacySettings();
      expect(send).toHaveBeenCalledWith("getPrivacySettings");
      expect(result).toEqual(settings);
    });

    it("tryFetchPrivacySettings defaults ignoreCache to false", async () => {
      mockResolve(send, { groupAdd: "all" });
      await client.tryFetchPrivacySettings();
      expect(send).toHaveBeenCalledWith("tryFetchPrivacySettings", {
        ignoreCache: false,
      });
    });

    it("tryFetchPrivacySettings forwards ignoreCache=true", async () => {
      mockResolve(send, { groupAdd: "all" });
      await client.tryFetchPrivacySettings(true);
      expect(send).toHaveBeenCalledWith("tryFetchPrivacySettings", {
        ignoreCache: true,
      });
    });

    it("setPrivacySetting sends whatsmeow wire-format name", async () => {
      mockResolve(send, { groupAdd: "contacts" });
      await client.setPrivacySetting("groupadd", "contacts");
      expect(send).toHaveBeenCalledWith("setPrivacySetting", {
        name: "groupadd",
        value: "contacts",
      });
    });

    it("setPrivacySetting accepts 'last' for lastSeen", async () => {
      mockResolve(send, { lastSeen: "none" });
      await client.setPrivacySetting("last", "none");
      expect(send).toHaveBeenCalledWith("setPrivacySetting", {
        name: "last",
        value: "none",
      });
    });

    it("setPrivacySetting accepts 'known' value for callAdd", async () => {
      mockResolve(send, { callAdd: "known" });
      await client.setPrivacySetting("calladd", "known");
      expect(send).toHaveBeenCalledWith("setPrivacySetting", {
        name: "calladd",
        value: "known",
      });
    });

    it("getStatusPrivacy sends no args", async () => {
      const statusPrivacy = [
        {
          type: "contacts",
          list: [],
          isDefault: true,
        },
      ];
      mockResolve(send, statusPrivacy);
      const result = await client.getStatusPrivacy();
      expect(send).toHaveBeenCalledWith("getStatusPrivacy");
      expect(result).toEqual(statusPrivacy);
    });

    it("setDefaultDisappearingTimer sends seconds", async () => {
      mockResolve(send);
      await client.setDefaultDisappearingTimer(86400);
      expect(send).toHaveBeenCalledWith("setDefaultDisappearingTimer", { seconds: 86400 });
    });

    it("setDefaultDisappearingTimer with 0 disables", async () => {
      mockResolve(send);
      await client.setDefaultDisappearingTimer(0);
      expect(send).toHaveBeenCalledWith("setDefaultDisappearingTimer", { seconds: 0 });
    });

    it("setDisappearingTimer sends jid and seconds", async () => {
      mockResolve(send);
      await client.setDisappearingTimer("chat@s.whatsapp.net", 604800);
      expect(send).toHaveBeenCalledWith("setDisappearingTimer", {
        jid: "chat@s.whatsapp.net",
        seconds: 604800,
      });
    });
  });

  // ── Blocklist ──────────────────────────────────

  describe("blocklist", () => {
    it("getBlocklist sends no args", async () => {
      mockResolve(send, { jids: ["blocked@s.whatsapp.net"] });
      const result = await client.getBlocklist();
      expect(send).toHaveBeenCalledWith("getBlocklist");
      expect(result.jids).toEqual(["blocked@s.whatsapp.net"]);
    });

    it("updateBlocklist sends jid and block action", async () => {
      mockResolve(send, { jids: ["blocked@s.whatsapp.net"] });
      await client.updateBlocklist("user@s.whatsapp.net", "block");
      expect(send).toHaveBeenCalledWith("updateBlocklist", {
        jid: "user@s.whatsapp.net",
        action: "block",
      });
    });

    it("updateBlocklist sends unblock action", async () => {
      mockResolve(send, { jids: [] });
      await client.updateBlocklist("user@s.whatsapp.net", "unblock");
      expect(send).toHaveBeenCalledWith("updateBlocklist", {
        jid: "user@s.whatsapp.net",
        action: "unblock",
      });
    });
  });

  // ── QR & Link Resolution ───────────────────────

  describe("QR & link resolution", () => {
    it("getContactQRLink defaults revoke to false, extracts link", async () => {
      mockResolve(send, { link: "https://wa.me/qr/abc" });
      const link = await client.getContactQRLink();
      expect(send).toHaveBeenCalledWith("getContactQRLink", { revoke: false });
      expect(link).toBe("https://wa.me/qr/abc");
    });

    it("getContactQRLink with revoke=true", async () => {
      mockResolve(send, { link: "https://wa.me/qr/new" });
      await client.getContactQRLink(true);
      expect(send).toHaveBeenCalledWith("getContactQRLink", { revoke: true });
    });

    it("resolveContactQRLink sends code", async () => {
      mockResolve(send, { jid: "user@s.whatsapp.net", type: "contact", pushName: "User" });
      const result = await client.resolveContactQRLink("qr-code-123");
      expect(send).toHaveBeenCalledWith("resolveContactQRLink", { code: "qr-code-123" });
      expect(result.pushName).toBe("User");
    });

    it("resolveBusinessMessageLink sends code", async () => {
      mockResolve(send, {
        jid: "biz@s.whatsapp.net",
        pushName: "Biz",
        message: "Hello",
        isSigned: true,
        verifiedLevel: "unknown",
        verifiedName: "Business Inc",
      });
      const result = await client.resolveBusinessMessageLink("biz-link");
      expect(send).toHaveBeenCalledWith("resolveBusinessMessageLink", { code: "biz-link" });
      expect(result.verifiedName).toBe("Business Inc");
      expect(result.isSigned).toBe(true);
      expect(result.verifiedLevel).toBe("unknown");
    });
  });

  // ── Calls ──────────────────────────────────────

  describe("calls", () => {
    it("rejectCall sends from and callId", async () => {
      mockResolve(send);
      await client.rejectCall("caller@s.whatsapp.net", "call-123");
      expect(send).toHaveBeenCalledWith("rejectCall", {
        from: "caller@s.whatsapp.net",
        callId: "call-123",
      });
    });
  });

  // ── Configuration ──────────────────────────────

  describe("configuration", () => {
    it("setPassive sends passive boolean", async () => {
      mockResolve(send);
      await client.setPassive(true);
      expect(send).toHaveBeenCalledWith("setPassive", { passive: true });
    });

    it("setForceActiveDeliveryReceipts sends active boolean", async () => {
      mockResolve(send);
      await client.setForceActiveDeliveryReceipts(false);
      expect(send).toHaveBeenCalledWith("setForceActiveDeliveryReceipts", { active: false });
    });
  });

  // ── Newsletter Updates & TOS ───────────────────

  describe("newsletter updates & TOS", () => {
    it("acceptTOSNotice sends noticeId and stage", async () => {
      mockResolve(send);
      await client.acceptTOSNotice("notice-1", "accept");
      expect(send).toHaveBeenCalledWith("acceptTOSNotice", {
        noticeId: "notice-1",
        stage: "accept",
      });
    });

    it("getNewsletterMessageUpdates sends jid and count with defaults", async () => {
      mockResolve(send, []);
      const result = await client.getNewsletterMessageUpdates("news@newsletter", 10);
      expect(send).toHaveBeenCalledWith("getNewsletterMessageUpdates", {
        jid: "news@newsletter",
        count: 10,
        since: 0,
        after: 0,
      });
      expect(result).toEqual([]);
    });

    it("getNewsletterMessageUpdates passes since and after opts", async () => {
      mockResolve(send, [{ serverId: 1, timestamp: 100, viewsCount: 5 }]);
      const result = await client.getNewsletterMessageUpdates("news@newsletter", 5, {
        since: 1700000000,
        after: 42,
      });
      expect(send).toHaveBeenCalledWith("getNewsletterMessageUpdates", {
        jid: "news@newsletter",
        count: 5,
        since: 1700000000,
        after: 42,
      });
      expect(result).toHaveLength(1);
    });
  });

  // ── Group Invite Operations ───────────────────

  describe("group invite operations", () => {
    it("getGroupInfoFromInvite sends all invite params", async () => {
      mockResolve(send, {
        jid: "group@g.us",
        name: "Test Group",
        announce: false,
        locked: false,
        ephemeral: false,
        participants: [],
      });
      const result = await client.getGroupInfoFromInvite(
        "group@g.us",
        "inviter@s.whatsapp.net",
        "invite-code",
        1700000000,
      );
      expect(send).toHaveBeenCalledWith("getGroupInfoFromInvite", {
        jid: "group@g.us",
        inviter: "inviter@s.whatsapp.net",
        code: "invite-code",
        expiration: 1700000000,
      });
      expect(result.name).toBe("Test Group");
    });

    it("joinGroupWithInvite sends all invite params", async () => {
      mockResolve(send);
      await client.joinGroupWithInvite(
        "group@g.us",
        "inviter@s.whatsapp.net",
        "invite-code",
        1700000000,
      );
      expect(send).toHaveBeenCalledWith("joinGroupWithInvite", {
        jid: "group@g.us",
        inviter: "inviter@s.whatsapp.net",
        code: "invite-code",
        expiration: 1700000000,
      });
    });
  });

  // ── Newsletter Upload ─────────────────────────

  describe("newsletter upload", () => {
    it("uploadNewsletter sends path and mediaType", async () => {
      mockResolve(send, {
        URL: "https://example.com/file",
        directPath: "/path",
        mediaKey: null,
        fileEncSHA256: null,
        fileSHA256: null,
        fileLength: 1024,
      });
      const result = await client.uploadNewsletter("/tmp/photo.jpg", "image");
      expect(send).toHaveBeenCalledWith("uploadNewsletter", {
        path: "/tmp/photo.jpg",
        mediaType: "image",
      });
      expect(result.URL).toBe("https://example.com/file");
      expect(result.mediaKey).toBeNull();
    });
  });

  // ── Download Any ──────────────────────────────

  describe("download any", () => {
    it("downloadAny sends message and returns path", async () => {
      mockResolve(send, { path: "/tmp/whatsmeow-123" });
      const result = await client.downloadAny({ imageMessage: { url: "https://example.com" } });
      expect(send).toHaveBeenCalledWith("downloadAny", {
        message: { imageMessage: { url: "https://example.com" } },
      });
      expect(result).toBe("/tmp/whatsmeow-123");
    });
  });

  // ── Connection Internals ──────────────────────

  describe("connection internals", () => {
    it("resetConnection sends command", async () => {
      mockResolve(send);
      await client.resetConnection();
      expect(send).toHaveBeenCalledWith("resetConnection");
    });
  });

  // ── Message Helpers ──────────────────────────

  describe("message helpers", () => {
    it("generateMessageID returns id", async () => {
      mockResolve(send, { id: "MSG-123" });
      const id = await client.generateMessageID();
      expect(send).toHaveBeenCalledWith("generateMessageID");
      expect(id).toBe("MSG-123");
    });

    it("buildMessageKey sends chat, sender, id", async () => {
      mockResolve(send, { remoteJid: "chat@g.us" });
      const result = await client.buildMessageKey("chat@g.us", "sender@s.whatsapp.net", "msg-1");
      expect(send).toHaveBeenCalledWith("buildMessageKey", {
        chat: "chat@g.us",
        sender: "sender@s.whatsapp.net",
        id: "msg-1",
      });
      expect(result.remoteJid).toBe("chat@g.us");
    });

    it("buildUnavailableMessageRequest sends chat, sender, id", async () => {
      mockResolve(send, { key: {} });
      await client.buildUnavailableMessageRequest("chat@g.us", "sender@s.whatsapp.net", "msg-1");
      expect(send).toHaveBeenCalledWith("buildUnavailableMessageRequest", {
        chat: "chat@g.us",
        sender: "sender@s.whatsapp.net",
        id: "msg-1",
      });
    });

    it("buildHistorySyncRequest sends info and count", async () => {
      mockResolve(send, { protocolMessage: {} });
      await client.buildHistorySyncRequest(
        { chat: "chat@g.us", sender: "sender@s.whatsapp.net", id: "msg-1" },
        10,
      );
      expect(send).toHaveBeenCalledWith("buildHistorySyncRequest", {
        info: { chat: "chat@g.us", sender: "sender@s.whatsapp.net", id: "msg-1" },
        count: 10,
      });
    });
  });

  // ── Peer & Retry ─────────────────────────────

  describe("peer & retry", () => {
    it("sendPeerMessage sends message and returns response", async () => {
      mockResolve(send, { id: "peer-1", timestamp: 1700000000 });
      const result = await client.sendPeerMessage({ protocolMessage: {} });
      expect(send).toHaveBeenCalledWith("sendPeerMessage", {
        message: { protocolMessage: {} },
      });
      expect(result.id).toBe("peer-1");
    });

    it("sendMediaRetryReceipt sends info and mediaKey", async () => {
      mockResolve(send);
      await client.sendMediaRetryReceipt(
        { chat: "chat@g.us", sender: "sender@s.whatsapp.net", id: "msg-1" },
        [1, 2, 3],
      );
      expect(send).toHaveBeenCalledWith("sendMediaRetryReceipt", {
        info: { chat: "chat@g.us", sender: "sender@s.whatsapp.net", id: "msg-1" },
        mediaKey: [1, 2, 3],
      });
    });
  });

  // ── Download Variants ────────────────────────

  describe("download variants", () => {
    it("downloadMediaWithPath sends opts and returns path", async () => {
      mockResolve(send, { path: "/tmp/media-123" });
      const result = await client.downloadMediaWithPath({
        directPath: "/media/file",
        encFileHash: [1, 2],
        fileHash: [3, 4],
        mediaKey: [5, 6],
        fileLength: 1024,
        mediaType: "image",
      });
      expect(send).toHaveBeenCalledWith("downloadMediaWithPath", {
        directPath: "/media/file",
        encFileHash: [1, 2],
        fileHash: [3, 4],
        mediaKey: [5, 6],
        fileLength: 1024,
        mediaType: "image",
        mmsType: "",
      });
      expect(result).toBe("/tmp/media-123");
    });
  });

  // ── Bot APIs ─────────────────────────────────

  describe("bot APIs", () => {
    it("getBotListV2 returns bot list", async () => {
      mockResolve(send, [{ botJid: "bot@s.whatsapp.net", personaId: "p1" }]);
      const result = await client.getBotListV2();
      expect(send).toHaveBeenCalledWith("getBotListV2");
      expect(result).toHaveLength(1);
      expect(result[0].botJid).toBe("bot@s.whatsapp.net");
    });

    it("getBotProfiles sends bots array", async () => {
      mockResolve(send, [{ jid: "bot@s.whatsapp.net", name: "TestBot" }]);
      const result = await client.getBotProfiles([
        { botJid: "bot@s.whatsapp.net", personaId: "p1" },
      ]);
      expect(send).toHaveBeenCalledWith("getBotProfiles", {
        bots: [{ botJid: "bot@s.whatsapp.net", personaId: "p1" }],
      });
      expect(result[0].name).toBe("TestBot");
    });
  });

  // ── App State ────────────────────────────────

  describe("app state", () => {
    it("fetchAppState sends name with defaults", async () => {
      mockResolve(send);
      await client.fetchAppState("regular");
      expect(send).toHaveBeenCalledWith("fetchAppState", {
        name: "regular",
        fullSync: false,
        onlyIfNotSynced: false,
      });
    });

    it("fetchAppState with fullSync=true", async () => {
      mockResolve(send);
      await client.fetchAppState("critical_block", true, true);
      expect(send).toHaveBeenCalledWith("fetchAppState", {
        name: "critical_block",
        fullSync: true,
        onlyIfNotSynced: true,
      });
    });

    it("markNotDirty sends cleanType and timestamp", async () => {
      mockResolve(send);
      await client.markNotDirty("contacts", 1700000000);
      expect(send).toHaveBeenCalledWith("markNotDirty", {
        cleanType: "contacts",
        timestamp: 1700000000,
      });
    });
  });

  // ── Decrypt / Encrypt ────────────────────────

  describe("decrypt / encrypt", () => {
    const info = { chat: "chat@g.us", sender: "sender@s.whatsapp.net", id: "msg-1" };
    const message = { commentMessage: { text: "hello" } };

    it("decryptComment sends info and message", async () => {
      mockResolve(send, { commentMessage: { text: "decrypted" } });
      const result = await client.decryptComment(info, message);
      expect(send).toHaveBeenCalledWith("decryptComment", { info, message });
      expect(result.commentMessage).toBeTruthy();
    });

    it("decryptPollVote sends info and message", async () => {
      mockResolve(send, { pollVoteMessage: {} });
      await client.decryptPollVote(info, message);
      expect(send).toHaveBeenCalledWith("decryptPollVote", { info, message });
    });

    it("decryptReaction sends info and message", async () => {
      mockResolve(send, { reactionMessage: {} });
      await client.decryptReaction(info, message);
      expect(send).toHaveBeenCalledWith("decryptReaction", { info, message });
    });

    it("decryptSecretEncryptedMessage sends info and message", async () => {
      mockResolve(send, { secretMessage: {} });
      await client.decryptSecretEncryptedMessage(info, message);
      expect(send).toHaveBeenCalledWith("decryptSecretEncryptedMessage", { info, message });
    });

    it("encryptComment sends info and message", async () => {
      mockResolve(send, { commentMessage: { text: "encrypted" } });
      await client.encryptComment(info, message);
      expect(send).toHaveBeenCalledWith("encryptComment", { info, message });
    });

    it("encryptPollVote sends info and vote", async () => {
      const vote = { selectedOptions: ["opt1"] };
      mockResolve(send, { pollVoteMessage: {} });
      await client.encryptPollVote(info, vote);
      expect(send).toHaveBeenCalledWith("encryptPollVote", { info, vote });
    });

    it("encryptReaction sends info and reaction", async () => {
      const reaction = { text: "👍" };
      mockResolve(send, { reactionMessage: {} });
      await client.encryptReaction(info, reaction);
      expect(send).toHaveBeenCalledWith("encryptReaction", { info, reaction });
    });
  });

  // ── Web Message Parsing ──────────────────────

  describe("web message parsing", () => {
    it("parseWebMessage sends chatJid and webMsg", async () => {
      mockResolve(send, {
        info: { chat: "chat@g.us", id: "msg-1" },
        message: { conversation: "hello" },
      });
      const result = await client.parseWebMessage("chat@g.us", {
        key: { remoteJid: "chat@g.us" },
      });
      expect(send).toHaveBeenCalledWith("parseWebMessage", {
        chatJid: "chat@g.us",
        webMsg: { key: { remoteJid: "chat@g.us" } },
      });
      expect(result.info.chat).toBe("chat@g.us");
      expect(result.message.conversation).toBe("hello");
    });
  });

  // ── Generic fallback ───────────────────────────

  describe("generic", () => {
    it("call sends arbitrary command and args", async () => {
      mockResolve(send, { custom: "data" });
      const result = await client.call("customCommand", { foo: "bar" });
      expect(send).toHaveBeenCalledWith("customCommand", { foo: "bar" });
      expect(result).toEqual({ custom: "data" });
    });

    it("call defaults args to empty object", async () => {
      mockResolve(send, null);
      await client.call("noArgs");
      expect(send).toHaveBeenCalledWith("noArgs", {});
    });
  });
});
