---
title: API Overview
sidebar_position: 1
---

# API Overview

## `createClient(options)`

Returns a `WhatsmeowClient` instance.

| Option           | Type     | Default   | Description                              |
|------------------|----------|-----------|------------------------------------------|
| `store`          | `string` | required  | SQLite path or Postgres URL              |
| `binaryPath`     | `string` | auto      | Path to the Go binary                    |
| `commandTimeout` | `number` | `30000`   | IPC command timeout in ms                |

## Connection

- `init()` — Open store and create whatsmeow client. Returns `{ jid }` if already paired.
- `getQRChannel()` — Set up QR pairing channel. Call before `connect()`.
- `pairCode(phone)` — Pair via phone number (alternative to QR). Call after `connect()`.
- `connect()` — Connect to WhatsApp
- `disconnect()` — Disconnect from WhatsApp
- `logout()` — Log out and remove device
- `isConnected()` — Check connection status
- `isLoggedIn()` — Check login status
- `waitForConnection(timeoutMs?)` — Wait until connected and logged in, or timeout
- `resetConnection()` — Reset the WebSocket connection
- `close()` — Kill the Go subprocess

## Messaging

- `sendMessage(jid, message)` — Send a typed message (conversation, extended text with replies)
- `sendRawMessage(jid, message)` — Send any `waE2E.Message`-shaped JSON
- `sendReaction(chat, sender, id, reaction)` — React to a message (empty string to remove)
- `editMessage(chat, id, message)` — Edit a previously sent message
- `revokeMessage(chat, sender, id)` — Revoke/delete a message
- `markRead(ids, chat, sender?)` — Mark messages as read

## Polls

- `sendPollCreation(jid, name, options, selectableCount)` — Create and send a poll
- `sendPollVote(pollChat, pollSender, pollId, pollTimestamp, options)` — Vote on a poll

## Media

- `downloadMedia(msg)` — Download media from a received message
- `downloadAny(message)` — Download media from any message type (auto-detects)
- `downloadMediaWithPath(opts)` — Download media using direct path and keys
- `uploadMedia(path, mediaType)` — Upload media for sending (`"image"` | `"video"` | `"audio"` | `"document"`)

Media uses temp file paths instead of base64 to avoid bloating the IPC pipe. Upload returns `{ URL, directPath, mediaKey, fileEncSHA256, fileSHA256, fileLength }`.

## Contacts & Users

- `isOnWhatsApp(phones)` — Check if phone numbers are on WhatsApp
- `getUserInfo(jids)` — Get user info (status, picture ID, verified name)
- `getProfilePicture(jid)` — Get profile picture URL
- `getUserDevices(jids)` — Get all devices for given users
- `getBusinessProfile(jid)` — Get business profile info
- `setStatusMessage(message)` — Set your account's status message

## Groups

- `createGroup(name, participants)` — Create a group
- `getGroupInfo(jid)` — Get group metadata
- `getGroupInfoFromLink(code)` — Get group info from an invite link
- `getGroupInfoFromInvite(jid, inviter, code, expiration)` — Get group info from a direct invite
- `getJoinedGroups()` — List all joined groups
- `getGroupInviteLink(jid, reset?)` — Get/reset invite link
- `joinGroupWithLink(code)` — Join via invite link
- `joinGroupWithInvite(jid, inviter, code, expiration)` — Join via direct invite
- `leaveGroup(jid)` — Leave a group
- `setGroupName(jid, name)` — Update group name
- `setGroupTopic(jid, topic, previousId?, newId?)` — Update group topic/description
- `setGroupDescription(jid, description)` — Update group description
- `setGroupPhoto(jid, path)` — Update group photo
- `setGroupAnnounce(jid, announce)` — Toggle announcement mode
- `setGroupLocked(jid, locked)` — Toggle group locked
- `updateGroupParticipants(jid, participants, action)` — Add/remove/promote/demote
- `getGroupRequestParticipants(jid)` — Get pending join requests
- `updateGroupRequestParticipants(jid, participants, action)` — Approve/reject join requests
- `setGroupMemberAddMode(jid, mode)` — `"admin_add"` | `"all_member_add"`
- `setGroupJoinApprovalMode(jid, enabled)` — Enable/disable join approval

## Communities

- `linkGroup(parent, child)` — Link a child group to a parent community
- `unlinkGroup(parent, child)` — Unlink a child group
- `getSubGroups(jid)` — Get sub-groups of a community
- `getLinkedGroupsParticipants(jid)` — Get participants across linked groups

## Presence

- `sendPresence(presence)` — Set online/offline status
- `sendChatPresence(jid, presence, media?)` — Set typing/recording indicator
- `subscribePresence(jid)` — Subscribe to a contact's presence

## Newsletters

- `getSubscribedNewsletters()` — List subscribed newsletters
- `newsletterSubscribeLiveUpdates(jid)` — Subscribe to live updates
- `createNewsletter(name, description, picture?)` — Create a newsletter/channel
- `getNewsletterInfo(jid)` — Get newsletter metadata
- `getNewsletterInfoWithInvite(key)` — Get newsletter info from invite link
- `followNewsletter(jid)` — Follow a newsletter
- `unfollowNewsletter(jid)` — Unfollow a newsletter
- `getNewsletterMessages(jid, count, before?)` — Fetch newsletter messages
- `getNewsletterMessageUpdates(jid, count, opts?)` — Get message updates
- `newsletterMarkViewed(jid, serverIds)` — Mark messages as viewed
- `newsletterSendReaction(jid, serverId, reaction, messageId)` — React to a newsletter message
- `newsletterToggleMute(jid, mute)` — Mute/unmute a newsletter
- `acceptTOSNotice(noticeId, stage)` — Accept a Terms of Service notice
- `uploadNewsletter(path, mediaType)` — Upload media for newsletter messages

## Privacy & Settings

- `getPrivacySettings()` — Get all privacy settings
- `tryFetchPrivacySettings(ignoreCache?)` — Fetch from cache or server
- `setPrivacySetting(name, value)` — Update a privacy setting
- `getStatusPrivacy()` — Get default status audience rules
- `setDefaultDisappearingTimer(seconds)` — Set default disappearing timer
- `setDisappearingTimer(jid, seconds)` — Set for a specific chat

## Blocklist

- `getBlocklist()` — Get blocked contacts
- `updateBlocklist(jid, action)` — Block/unblock (`"block"` | `"unblock"`)

## QR & Link Resolution

- `getContactQRLink(revoke?)` — Generate or revoke your contact QR link
- `resolveContactQRLink(code)` — Resolve a contact QR code to user info
- `resolveBusinessMessageLink(code)` — Resolve a business message link

## Calls

- `rejectCall(from, callId)` — Reject an incoming call

## Configuration

- `setPassive(passive)` — Set passive mode (don't receive messages)
- `setForceActiveDeliveryReceipts(active)` — Force sending delivery receipts

## Message Helpers

- `generateMessageID()` — Generate a unique message ID
- `buildMessageKey(chat, sender, id)` — Build a protobuf message key
- `buildUnavailableMessageRequest(chat, sender, id)` — Build a request for unavailable messages
- `buildHistorySyncRequest(info, count)` — Build a history sync request message
- `sendPeerMessage(message)` — Send a message to your own devices
- `sendMediaRetryReceipt(info, mediaKey)` — Request re-upload of media from the sender

## Bots

- `getBotListV2()` — Get the list of available bots
- `getBotProfiles(bots)` — Get profiles for specific bots

## App State

- `fetchAppState(name, fullSync?, onlyIfNotSynced?)` — Fetch app state from the server
- `markNotDirty(cleanType, timestamp)` — Mark an app state patch as not dirty

## Decrypt / Encrypt

- `decryptComment(info, message)` — Decrypt a comment message
- `decryptPollVote(info, message)` — Decrypt a poll vote message
- `decryptReaction(info, message)` — Decrypt a reaction message
- `decryptSecretEncryptedMessage(info, message)` — Decrypt a secret encrypted message
- `encryptComment(info, message)` — Encrypt a comment
- `encryptPollVote(info, vote)` — Encrypt a poll vote
- `encryptReaction(info, reaction)` — Encrypt a reaction

## Web Message Parsing

- `parseWebMessage(chatJid, webMsg)` — Parse a WebMessageInfo (from history sync) into a message event

## Generic

- `call(method, args)` — Send any command to the Go binary (escape hatch)
