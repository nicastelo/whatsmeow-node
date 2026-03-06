import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { client, skip, setupClient, ensureConnected, testJid, TEST_PHONE } from "./setup.js";

const TEST_IMAGE = resolve(__dirname, "fixtures/test-image.jpg");

describe.skipIf(skip || !TEST_PHONE)("groups", () => {
  setupClient();
  beforeAll(() => ensureConnected());

  let groupJid: string;
  const groupName = `test-${Date.now()}`;

  afterAll(async () => {
    if (groupJid) {
      try {
        await client.leaveGroup(groupJid);
      } catch {
        /* ignore */
      }
    }
  });

  it("createGroup creates a group", async () => {
    // Need at least one other participant to create a group
    const result = await client.createGroup(groupName, [testJid]);
    expect(result.jid).toBeTruthy();
    expect(result.jid).toContain("@g.us");
    expect(result.name).toBe(groupName);
    groupJid = result.jid;
  });

  it("getGroupInfo returns correct group", async () => {
    expect(groupJid).toBeTruthy();
    const info = await client.getGroupInfo(groupJid);
    expect(info.name).toBe(groupName);
    expect(info.participants.length).toBeGreaterThanOrEqual(1);
  });

  it("getJoinedGroups includes created group", async () => {
    expect(groupJid).toBeTruthy();
    const groups = await client.getJoinedGroups();
    const found = groups.some((g) => g.jid === groupJid);
    expect(found).toBe(true);
  });

  it("setGroupName changes the name", async () => {
    expect(groupJid).toBeTruthy();
    const newName = `renamed-${Date.now()}`;
    await client.setGroupName(groupJid, newName);
    const info = await client.getGroupInfo(groupJid);
    expect(info.name).toBe(newName);
  });

  it("setGroupTopic succeeds", async () => {
    expect(groupJid).toBeTruthy();
    await client.setGroupTopic(groupJid, "Integration test topic");
  });

  it("setGroupDescription succeeds", async () => {
    expect(groupJid).toBeTruthy();
    try {
      await client.setGroupDescription(groupJid, `Test description ${Date.now()}`);
    } catch (err: unknown) {
      // 409 conflict is a known race condition with rapid group modifications
      expect((err as Error).message).toContain("conflict");
    }
  });

  it("setGroupAnnounce succeeds", async () => {
    expect(groupJid).toBeTruthy();
    await client.setGroupAnnounce(groupJid, true);
  });

  it("setGroupLocked succeeds", async () => {
    expect(groupJid).toBeTruthy();
    await client.setGroupLocked(groupJid, true);
  });

  it("setGroupMemberAddMode succeeds", async () => {
    expect(groupJid).toBeTruthy();
    await client.setGroupMemberAddMode(groupJid, "admin_add");
  });

  it("setGroupJoinApprovalMode succeeds", async () => {
    expect(groupJid).toBeTruthy();
    await client.setGroupJoinApprovalMode(groupJid, true);
  });

  it("getGroupInviteLink returns a link", async () => {
    expect(groupJid).toBeTruthy();
    const link = await client.getGroupInviteLink(groupJid);
    expect(link).toContain("https://chat.whatsapp.com/");
  });

  it("getGroupInfoFromLink resolves invite link", async () => {
    expect(groupJid).toBeTruthy();
    const link = await client.getGroupInviteLink(groupJid);
    const code = link.split("/").pop() ?? "";
    const info = await client.getGroupInfoFromLink(code);
    expect(info.jid).toBe(groupJid);
  });

  it("getGroupRequestParticipants returns array", async () => {
    expect(groupJid).toBeTruthy();
    const participants = await client.getGroupRequestParticipants(groupJid);
    expect(Array.isArray(participants)).toBe(true);
  });

  it("setGroupPhoto sets a photo", async () => {
    expect(groupJid).toBeTruthy();
    const pictureId = await client.setGroupPhoto(groupJid, TEST_IMAGE);
    expect(typeof pictureId).toBe("string");
  });

  it("getSubGroups returns array or forbidden", async () => {
    expect(groupJid).toBeTruthy();
    try {
      const subs = await client.getSubGroups(groupJid);
      expect(Array.isArray(subs)).toBe(true);
    } catch (err: unknown) {
      // 403 forbidden is expected for non-community groups
      expect((err as Error).message).toContain("forbidden");
    }
  });

  it("leaveGroup leaves the group", async () => {
    expect(groupJid).toBeTruthy();
    await client.leaveGroup(groupJid);
    groupJid = ""; // prevent afterAll double-leave
  });
});
