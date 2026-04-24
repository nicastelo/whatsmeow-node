package main

import (
	"context"
	"encoding/json"
	"sync"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
)

type App struct {
	mu        sync.Mutex
	client    *whatsmeow.Client
	container *sqlstore.Container
	ctx       context.Context
	cancel    context.CancelFunc
}

func newApp() *App {
	ctx, cancel := context.WithCancel(context.Background())
	return &App{ctx: ctx, cancel: cancel}
}

func (a *App) shutdown() {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.client != nil {
		a.client.Disconnect()
	}
	if a.container != nil {
		a.container.Close()
	}
	a.cancel()
}

func (a *App) handleCommand(cmd Command) {
	switch cmd.Cmd {
	// Connection & Auth
	case "init":
		a.cmdInit(cmd)
	case "connect":
		a.cmdConnect(cmd)
	case "disconnect":
		a.cmdDisconnect(cmd)
	case "logout":
		a.cmdLogout(cmd)
	case "isConnected":
		a.cmdIsConnected(cmd)
	case "isLoggedIn":
		a.cmdIsLoggedIn(cmd)
	case "waitForConnection":
		a.cmdWaitForConnection(cmd)

	// Pairing
	case "getQRChannel":
		a.cmdGetQRChannel(cmd)
	case "pairCode":
		a.cmdPairCode(cmd)

	// Messaging
	case "sendMessage":
		a.cmdSendMessage(cmd)
	case "revokeMessage":
		a.cmdRevokeMessage(cmd)
	case "markRead":
		a.cmdMarkRead(cmd)

	// Media
	case "downloadMedia":
		a.cmdDownloadMedia(cmd)

	// Contacts & Users
	case "isOnWhatsApp":
		a.cmdIsOnWhatsApp(cmd)
	case "getUserInfo":
		a.cmdGetUserInfo(cmd)
	case "getProfilePicture":
		a.cmdGetProfilePicture(cmd)

	// Groups
	case "createGroup":
		a.cmdCreateGroup(cmd)
	case "getGroupInfo":
		a.cmdGetGroupInfo(cmd)
	case "getJoinedGroups":
		a.cmdGetJoinedGroups(cmd)
	case "getGroupInviteLink":
		a.cmdGetGroupInviteLink(cmd)
	case "joinGroupWithLink":
		a.cmdJoinGroupWithLink(cmd)
	case "leaveGroup":
		a.cmdLeaveGroup(cmd)
	case "setGroupName":
		a.cmdSetGroupName(cmd)
	case "setGroupTopic":
		a.cmdSetGroupTopic(cmd)
	case "setGroupPhoto":
		a.cmdSetGroupPhoto(cmd)
	case "setGroupAnnounce":
		a.cmdSetGroupAnnounce(cmd)
	case "setGroupLocked":
		a.cmdSetGroupLocked(cmd)
	case "updateGroupParticipants":
		a.cmdUpdateGroupParticipants(cmd)

	// Presence
	case "sendPresence":
		a.cmdSendPresence(cmd)
	case "sendChatPresence":
		a.cmdSendChatPresence(cmd)
	case "subscribePresence":
		a.cmdSubscribePresence(cmd)

	// Newsletters
	case "getSubscribedNewsletters":
		a.cmdGetSubscribedNewsletters(cmd)
	case "newsletterSubscribeLiveUpdates":
		a.cmdNewsletterSubscribeLiveUpdates(cmd)

	// Calls
	case "rejectCall":
		a.cmdRejectCall(cmd)

	// ── Extra: Message Operations ──────────────────
	case "sendReaction":
		a.cmdSendReaction(cmd)
	case "editMessage":
		a.cmdEditMessage(cmd)
	case "sendPollCreation":
		a.cmdSendPollCreation(cmd)
	case "sendPollVote":
		a.cmdSendPollVote(cmd)

	// ── Extra: Advanced Groups ─────────────────────
	case "setGroupDescription":
		a.cmdSetGroupDescription(cmd)
	case "getGroupInfoFromLink":
		a.cmdGetGroupInfoFromLink(cmd)
	case "getGroupRequestParticipants":
		a.cmdGetGroupRequestParticipants(cmd)
	case "updateGroupRequestParticipants":
		a.cmdUpdateGroupRequestParticipants(cmd)
	case "setGroupMemberAddMode":
		a.cmdSetGroupMemberAddMode(cmd)
	case "setGroupJoinApprovalMode":
		a.cmdSetGroupJoinApprovalMode(cmd)
	case "linkGroup":
		a.cmdLinkGroup(cmd)
	case "unlinkGroup":
		a.cmdUnlinkGroup(cmd)
	case "getSubGroups":
		a.cmdGetSubGroups(cmd)
	case "getLinkedGroupsParticipants":
		a.cmdGetLinkedGroupsParticipants(cmd)

	// ── Extra: Newsletter Operations ───────────────
	case "createNewsletter":
		a.cmdCreateNewsletter(cmd)
	case "getNewsletterInfo":
		a.cmdGetNewsletterInfo(cmd)
	case "getNewsletterInfoWithInvite":
		a.cmdGetNewsletterInfoWithInvite(cmd)
	case "followNewsletter":
		a.cmdFollowNewsletter(cmd)
	case "unfollowNewsletter":
		a.cmdUnfollowNewsletter(cmd)
	case "getNewsletterMessages":
		a.cmdGetNewsletterMessages(cmd)
	case "newsletterMarkViewed":
		a.cmdNewsletterMarkViewed(cmd)
	case "newsletterSendReaction":
		a.cmdNewsletterSendReaction(cmd)
	case "newsletterToggleMute":
		a.cmdNewsletterToggleMute(cmd)

	// ── Extra: User & Contact Operations ───────────
	case "getUserDevices":
		a.cmdGetUserDevices(cmd)
	case "getBusinessProfile":
		a.cmdGetBusinessProfile(cmd)
	case "setStatusMessage":
		a.cmdSetStatusMessage(cmd)

	// ── Extra: Privacy & Settings ──────────────────
	case "getPrivacySettings":
		a.cmdGetPrivacySettings(cmd)
	case "tryFetchPrivacySettings":
		a.cmdTryFetchPrivacySettings(cmd)
	case "setPrivacySetting":
		a.cmdSetPrivacySetting(cmd)
	case "getStatusPrivacy":
		a.cmdGetStatusPrivacy(cmd)
	case "setDefaultDisappearingTimer":
		a.cmdSetDefaultDisappearingTimer(cmd)
	case "setDisappearingTimer":
		a.cmdSetDisappearingTimer(cmd)

	// ── Extra: Blocklist ───────────────────────────
	case "getBlocklist":
		a.cmdGetBlocklist(cmd)
	case "updateBlocklist":
		a.cmdUpdateBlocklist(cmd)

	// ── Extra: QR & Link Resolution ────────────────
	case "getContactQRLink":
		a.cmdGetContactQRLink(cmd)
	case "resolveContactQRLink":
		a.cmdResolveContactQRLink(cmd)
	case "resolveBusinessMessageLink":
		a.cmdResolveBusinessMessageLink(cmd)

	// ── Extra: Media Upload ────────────────────────
	case "uploadMedia":
		a.cmdUploadMedia(cmd)
	case "deleteMedia":
		a.cmdDeleteMedia(cmd)

	// ── Extra: Configuration ───────────────────────
	case "setPassive":
		a.cmdSetPassive(cmd)
	case "setForceActiveDeliveryReceipts":
		a.cmdSetForceActiveDeliveryReceipts(cmd)

	// ── Extra: Newsletter Updates & TOS ────────────
	case "acceptTOSNotice":
		a.cmdAcceptTOSNotice(cmd)
	case "getNewsletterMessageUpdates":
		a.cmdGetNewsletterMessageUpdates(cmd)

	// ── Extra: Group Invite Operations ─────────────
	case "getGroupInfoFromInvite":
		a.cmdGetGroupInfoFromInvite(cmd)
	case "joinGroupWithInvite":
		a.cmdJoinGroupWithInvite(cmd)

	// ── Extra: Newsletter Upload ───────────────────
	case "uploadNewsletter":
		a.cmdUploadNewsletter(cmd)

	// ── Extra: Download Any ───────────────────────
	case "downloadAny":
		a.cmdDownloadAny(cmd)

	// ── Extra: Connection Internals ───────────────
	case "resetConnection":
		a.cmdResetConnection(cmd)

	// ── Extra: Message Helpers ────────────────────
	case "generateMessageID":
		a.cmdGenerateMessageID(cmd)
	case "buildMessageKey":
		a.cmdBuildMessageKey(cmd)
	case "buildUnavailableMessageRequest":
		a.cmdBuildUnavailableMessageRequest(cmd)
	case "buildHistorySyncRequest":
		a.cmdBuildHistorySyncRequest(cmd)

	// ── Extra: Peer & Retry ──────────────────────
	case "sendPeerMessage":
		a.cmdSendPeerMessage(cmd)
	case "sendMediaRetryReceipt":
		a.cmdSendMediaRetryReceipt(cmd)

	// ── Extra: Download Variants ─────────────────
	case "downloadMediaWithPath":
		a.cmdDownloadMediaWithPath(cmd)

	// ── Extra: Bot APIs ──────────────────────────
	case "getBotListV2":
		a.cmdGetBotListV2(cmd)
	case "getBotProfiles":
		a.cmdGetBotProfiles(cmd)

	// ── Extra: App State ─────────────────────────
	case "fetchAppState":
		a.cmdFetchAppState(cmd)
	case "markNotDirty":
		a.cmdMarkNotDirty(cmd)

	// ── Extra: Decrypt / Encrypt ─────────────────
	case "decryptComment":
		a.cmdDecryptComment(cmd)
	case "decryptPollVote":
		a.cmdDecryptPollVote(cmd)
	case "decryptReaction":
		a.cmdDecryptReaction(cmd)
	case "decryptSecretEncryptedMessage":
		a.cmdDecryptSecretEncryptedMessage(cmd)
	case "encryptComment":
		a.cmdEncryptComment(cmd)
	case "encryptPollVote":
		a.cmdEncryptPollVote(cmd)
	case "encryptReaction":
		a.cmdEncryptReaction(cmd)

	// ── Extra: Web Message Parsing ───────────────
	case "parseWebMessage":
		a.cmdParseWebMessage(cmd)

	default:
		sendError(cmd.ID, "unknown command: "+cmd.Cmd, "ERR_UNKNOWN_CMD")
	}
}

// parseArgs is a helper to unmarshal command args into a typed struct.
func parseArgs[T any](cmd Command) (T, bool) {
	var args T
	if err := json.Unmarshal(cmd.Args, &args); err != nil {
		sendError(cmd.ID, "invalid args: "+err.Error(), "ERR_INVALID_ARGS")
		return args, false
	}
	return args, true
}

// requireClient returns the whatsmeow client or sends an error if not initialized.
func (a *App) requireClient(cmd Command) *whatsmeow.Client {
	a.mu.Lock()
	c := a.client
	a.mu.Unlock()
	if c == nil {
		sendError(cmd.ID, "not initialized — call init first", "ERR_NOT_INIT")
		return nil
	}
	return c
}
