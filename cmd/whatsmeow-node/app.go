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
	case "connect":
		a.cmdConnect(cmd)
	case "disconnect":
		a.cmdDisconnect(cmd)
	case "logout":
		a.cmdLogout(cmd)
	case "status":
		a.cmdStatus(cmd)
	case "pair:qr":
		a.cmdPairQR(cmd)
	case "pair:code":
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

// requireClient returns the whatsmeow client or sends an error if not connected.
func (a *App) requireClient(cmd Command) *whatsmeow.Client {
	a.mu.Lock()
	c := a.client
	a.mu.Unlock()
	if c == nil {
		sendError(cmd.ID, "not connected", "ERR_NOT_CONNECTED")
		return nil
	}
	return c
}
