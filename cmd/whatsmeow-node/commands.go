package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
	waProto "go.mau.fi/whatsmeow/proto/waE2E"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

// ── Connection & Auth ──────────────────────────────

func (a *App) cmdConnect(cmd Command) {
	args, ok := parseArgs[struct {
		Store string `json:"store"`
	}](cmd)
	if !ok {
		return
	}

	a.mu.Lock()
	if a.client != nil {
		a.mu.Unlock()
		sendError(cmd.ID, "already connected", "ERR_ALREADY_CONNECTED")
		return
	}
	a.mu.Unlock()

	container, err := openStore(a.ctx, args.Store)
	if err != nil {
		sendError(cmd.ID, "failed to open store: "+err.Error(), "ERR_STORE")
		return
	}

	device, err := container.GetFirstDevice(a.ctx)
	if err != nil {
		_ = container.Close()
		sendError(cmd.ID, "failed to get device: "+err.Error(), "ERR_STORE")
		return
	}

	logger := waLog.Noop
	client := whatsmeow.NewClient(device, logger)
	client.AddEventHandler(a.eventHandler)

	// If not paired yet, set up QR channel before connecting.
	// GetQRChannel must be called before Connect() per whatsmeow API.
	needsPairing := device.ID == nil
	if needsPairing {
		qrChan, err := client.GetQRChannel(a.ctx)
		if err != nil {
			_ = container.Close()
			sendError(cmd.ID, "failed to get QR channel: "+err.Error(), "ERR_QR")
			return
		}
		// Forward QR events in background
		go func() {
			for item := range qrChan {
				switch item.Event {
				case "code":
					sendEvent("qr", map[string]interface{}{"code": item.Code})
				case "success":
					// connected event fires separately
				case "timeout":
					sendEvent("qr:timeout", nil)
				default:
					sendEvent("qr:error", map[string]interface{}{"event": item.Event})
				}
			}
		}()
	}

	if err := client.Connect(); err != nil {
		_ = container.Close()
		sendError(cmd.ID, "failed to connect: "+err.Error(), "ERR_CONNECT")
		return
	}

	a.mu.Lock()
	a.client = client
	a.container = container
	a.mu.Unlock()

	data := map[string]interface{}{
		"needsPairing": needsPairing,
	}
	if device.ID != nil {
		data["jid"] = device.ID.String()
	}
	sendResponse(cmd.ID, data)
}

func (a *App) cmdDisconnect(cmd Command) {
	a.mu.Lock()
	if a.client != nil {
		a.client.Disconnect()
		a.client = nil
	}
	if a.container != nil {
		_ = a.container.Close()
		a.container = nil
	}
	a.mu.Unlock()
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdLogout(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}
	if err := client.Logout(a.ctx); err != nil {
		sendError(cmd.ID, err.Error(), "ERR_LOGOUT")
		return
	}
	a.mu.Lock()
	a.client.Disconnect()
	a.client = nil
	if a.container != nil {
		_ = a.container.Close()
		a.container = nil
	}
	a.mu.Unlock()
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdStatus(cmd Command) {
	a.mu.Lock()
	c := a.client
	a.mu.Unlock()

	data := map[string]interface{}{
		"connected": false,
		"loggedIn":  false,
	}
	if c != nil {
		data["connected"] = c.IsConnected()
		data["loggedIn"] = c.IsLoggedIn()
		if c.Store.ID != nil {
			data["jid"] = c.Store.ID.String()
		}
	}
	sendResponse(cmd.ID, data)
}

func (a *App) cmdPairQR(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	qrChan, err := client.GetQRChannel(a.ctx)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_QR")
		return
	}

	// Respond immediately — QR codes come as events
	sendResponse(cmd.ID, nil)

	// Forward QR events in a goroutine
	go func() {
		for item := range qrChan {
			switch item.Event {
			case "code":
				sendEvent("qr", map[string]interface{}{"code": item.Code})
			case "success":
				// connected event will fire separately
			case "timeout":
				sendEvent("qr:timeout", nil)
			default:
				sendEvent("qr:error", map[string]interface{}{
					"event": item.Event,
				})
			}
		}
	}()
}

func (a *App) cmdPairCode(cmd Command) {
	args, ok := parseArgs[struct {
		Phone string `json:"phone"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	code, err := client.PairPhone(a.ctx, args.Phone, true, whatsmeow.PairClientChrome, "Chrome")
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_PAIR")
		return
	}
	sendResponse(cmd.ID, map[string]interface{}{"code": code})
}

// ── Messaging ──────────────────────────────────────

func (a *App) cmdSendMessage(cmd Command) {
	args, ok := parseArgs[struct {
		JID     string                 `json:"jid"`
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID: "+err.Error(), "ERR_INVALID_JID")
		return
	}

	msg := buildProtoMessage(args.Message)

	resp, err := client.SendMessage(a.ctx, jid, msg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SEND")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"id":        resp.ID,
		"timestamp": resp.Timestamp.Unix(),
	})
}

func (a *App) cmdRevokeMessage(cmd Command) {
	args, ok := parseArgs[struct {
		Chat   string `json:"chat"`
		Sender string `json:"sender"`
		ID     string `json:"id"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	chat, err := types.ParseJID(args.Chat)
	if err != nil {
		sendError(cmd.ID, "invalid chat JID", "ERR_INVALID_JID")
		return
	}

	sender, err := types.ParseJID(args.Sender)
	if err != nil {
		sendError(cmd.ID, "invalid sender JID", "ERR_INVALID_JID")
		return
	}

	_, err = client.SendMessage(a.ctx, chat, client.BuildRevoke(chat, sender, args.ID))
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_REVOKE")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdMarkRead(cmd Command) {
	args, ok := parseArgs[struct {
		IDs    []string `json:"ids"`
		Chat   string   `json:"chat"`
		Sender string   `json:"sender"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	chat, err := types.ParseJID(args.Chat)
	if err != nil {
		sendError(cmd.ID, "invalid chat JID", "ERR_INVALID_JID")
		return
	}

	sender, _ := types.ParseJID(args.Sender)

	msgIDs := make([]types.MessageID, len(args.IDs))
	for i, id := range args.IDs {
		msgIDs[i] = id
	}

	err = client.MarkRead(a.ctx, msgIDs, time.Now(), chat, sender)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_MARK_READ")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Media ──────────────────────────────────────────

func (a *App) cmdDownloadMedia(cmd Command) {
	args, ok := parseArgs[struct {
		DirectPath string `json:"directPath"`
		MediaKey   []byte `json:"mediaKey"`
		FileHash   []byte `json:"fileSha256"`
		EncHash    []byte `json:"fileEncSha256"`
		MediaType  string `json:"mediaType"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	data, err := client.Download(a.ctx, &downloadableMsg{
		directPath:    args.DirectPath,
		mediaKey:      args.MediaKey,
		fileSHA256:    args.FileHash,
		fileEncSHA256: args.EncHash,
	})
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_DOWNLOAD")
		return
	}

	tmpFile, err := os.CreateTemp("", "whatsmeow-*")
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_TEMPFILE")
		return
	}
	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		os.Remove(tmpFile.Name())
		sendError(cmd.ID, err.Error(), "ERR_WRITE")
		return
	}
	tmpFile.Close()

	sendResponse(cmd.ID, map[string]interface{}{
		"path": tmpFile.Name(),
	})
}

// ── Contacts & Users ───────────────────────────────

func (a *App) cmdIsOnWhatsApp(cmd Command) {
	args, ok := parseArgs[struct {
		Phones []string `json:"phones"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	results, err := client.IsOnWhatsApp(a.ctx, args.Phones)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_CHECK")
		return
	}

	out := make([]map[string]interface{}, len(results))
	for i, r := range results {
		out[i] = map[string]interface{}{
			"query": r.Query,
			"isIn":  r.IsIn,
		}
		if r.JID != (types.JID{}) {
			out[i]["jid"] = r.JID.String()
		}
	}
	sendResponse(cmd.ID, out)
}

func (a *App) cmdGetUserInfo(cmd Command) {
	args, ok := parseArgs[struct {
		JIDs []string `json:"jids"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jids := make([]types.JID, len(args.JIDs))
	for i, j := range args.JIDs {
		parsed, err := types.ParseJID(j)
		if err != nil {
			sendError(cmd.ID, "invalid JID: "+j, "ERR_INVALID_JID")
			return
		}
		jids[i] = parsed
	}

	info, err := client.GetUserInfo(a.ctx, jids)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_USER_INFO")
		return
	}

	out := map[string]interface{}{}
	for jid, ui := range info {
		out[jid.String()] = map[string]interface{}{
			"status":       ui.Status,
			"pictureID":    ui.PictureID,
			"verifiedName": ui.VerifiedName,
		}
	}
	sendResponse(cmd.ID, out)
}

func (a *App) cmdGetProfilePicture(cmd Command) {
	args, ok := parseArgs[struct {
		JID string `json:"jid"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	pic, err := client.GetProfilePictureInfo(a.ctx, jid, nil)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_PROFILE_PIC")
		return
	}

	data := map[string]interface{}{}
	if pic != nil {
		data["url"] = pic.URL
		data["id"] = pic.ID
		data["type"] = pic.Type
	}
	sendResponse(cmd.ID, data)
}

// ── Groups ─────────────────────────────────────────

func (a *App) cmdCreateGroup(cmd Command) {
	args, ok := parseArgs[struct {
		Name         string   `json:"name"`
		Participants []string `json:"participants"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jids := make([]types.JID, len(args.Participants))
	for i, j := range args.Participants {
		parsed, err := types.ParseJID(j)
		if err != nil {
			sendError(cmd.ID, "invalid participant JID: "+j, "ERR_INVALID_JID")
			return
		}
		jids[i] = parsed
	}

	info, err := client.CreateGroup(a.ctx, whatsmeow.ReqCreateGroup{
		Name:         args.Name,
		Participants: jids,
	})
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_CREATE_GROUP")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"jid":  info.JID.String(),
		"name": info.Name,
	})
}

func (a *App) cmdGetGroupInfo(cmd Command) {
	args, ok := parseArgs[struct {
		JID string `json:"jid"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	info, err := client.GetGroupInfo(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GROUP_INFO")
		return
	}

	sendResponse(cmd.ID, serializeGroupInfo(info))
}

func (a *App) cmdGetJoinedGroups(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	groups, err := client.GetJoinedGroups(a.ctx)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GROUPS")
		return
	}

	out := make([]map[string]interface{}, len(groups))
	for i, g := range groups {
		out[i] = serializeGroupInfo(g)
	}
	sendResponse(cmd.ID, out)
}

func (a *App) cmdGetGroupInviteLink(cmd Command) {
	args, ok := parseArgs[struct {
		JID   string `json:"jid"`
		Reset bool   `json:"reset"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	link, err := client.GetGroupInviteLink(a.ctx, jid, args.Reset)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVITE_LINK")
		return
	}
	sendResponse(cmd.ID, map[string]interface{}{"link": link})
}

func (a *App) cmdJoinGroupWithLink(cmd Command) {
	args, ok := parseArgs[struct {
		Code string `json:"code"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := client.JoinGroupWithLink(a.ctx, args.Code)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_JOIN_GROUP")
		return
	}
	sendResponse(cmd.ID, map[string]interface{}{"jid": jid.String()})
}

func (a *App) cmdLeaveGroup(cmd Command) {
	args, ok := parseArgs[struct {
		JID string `json:"jid"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	err = client.LeaveGroup(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_LEAVE_GROUP")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdSetGroupName(cmd Command) {
	args, ok := parseArgs[struct {
		JID  string `json:"jid"`
		Name string `json:"name"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	err = client.SetGroupName(a.ctx, jid, args.Name)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_GROUP_NAME")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdSetGroupPhoto(cmd Command) {
	args, ok := parseArgs[struct {
		JID  string `json:"jid"`
		Path string `json:"path"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	data, err := os.ReadFile(args.Path)
	if err != nil {
		sendError(cmd.ID, "failed to read photo: "+err.Error(), "ERR_READ_FILE")
		return
	}

	pictureID, err := client.SetGroupPhoto(a.ctx, jid, data)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_GROUP_PHOTO")
		return
	}
	sendResponse(cmd.ID, map[string]interface{}{"pictureId": pictureID})
}

func (a *App) cmdSetGroupAnnounce(cmd Command) {
	args, ok := parseArgs[struct {
		JID      string `json:"jid"`
		Announce bool   `json:"announce"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	err = client.SetGroupAnnounce(a.ctx, jid, args.Announce)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_GROUP_ANNOUNCE")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdSetGroupLocked(cmd Command) {
	args, ok := parseArgs[struct {
		JID    string `json:"jid"`
		Locked bool   `json:"locked"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	err = client.SetGroupLocked(a.ctx, jid, args.Locked)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_GROUP_LOCKED")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdUpdateGroupParticipants(cmd Command) {
	args, ok := parseArgs[struct {
		JID          string   `json:"jid"`
		Participants []string `json:"participants"`
		Action       string   `json:"action"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	pJIDs := make([]types.JID, len(args.Participants))
	for i, p := range args.Participants {
		parsed, err := types.ParseJID(p)
		if err != nil {
			sendError(cmd.ID, "invalid participant JID: "+p, "ERR_INVALID_JID")
			return
		}
		pJIDs[i] = parsed
	}

	var action whatsmeow.ParticipantChange
	switch args.Action {
	case "add":
		action = whatsmeow.ParticipantChangeAdd
	case "remove":
		action = whatsmeow.ParticipantChangeRemove
	case "promote":
		action = whatsmeow.ParticipantChangePromote
	case "demote":
		action = whatsmeow.ParticipantChangeDemote
	default:
		sendError(cmd.ID, "invalid action: "+args.Action, "ERR_INVALID_ARGS")
		return
	}

	_, err = client.UpdateGroupParticipants(a.ctx, jid, pJIDs, action)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UPDATE_PARTICIPANTS")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Presence ───────────────────────────────────────

func (a *App) cmdSendPresence(cmd Command) {
	args, ok := parseArgs[struct {
		Presence string `json:"presence"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	var pres types.Presence
	switch args.Presence {
	case "available":
		pres = types.PresenceAvailable
	case "unavailable":
		pres = types.PresenceUnavailable
	default:
		sendError(cmd.ID, "invalid presence: "+args.Presence, "ERR_INVALID_ARGS")
		return
	}

	err := client.SendPresence(a.ctx, pres)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_PRESENCE")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdSendChatPresence(cmd Command) {
	args, ok := parseArgs[struct {
		JID      string `json:"jid"`
		Presence string `json:"presence"`
		Media    string `json:"media"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	var state types.ChatPresence
	switch args.Presence {
	case "composing":
		state = types.ChatPresenceComposing
	case "paused":
		state = types.ChatPresencePaused
	default:
		sendError(cmd.ID, "invalid chat presence: "+args.Presence, "ERR_INVALID_ARGS")
		return
	}

	var media types.ChatPresenceMedia
	switch args.Media {
	case "audio":
		media = types.ChatPresenceMediaAudio
	case "":
		// no media
	default:
		sendError(cmd.ID, "invalid media: "+args.Media, "ERR_INVALID_ARGS")
		return
	}

	err = client.SendChatPresence(a.ctx, jid, state, media)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_CHAT_PRESENCE")
		return
	}
	sendResponse(cmd.ID, nil)
}

func (a *App) cmdSubscribePresence(cmd Command) {
	args, ok := parseArgs[struct {
		JID string `json:"jid"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	err = client.SubscribePresence(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SUBSCRIBE_PRESENCE")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Newsletters ────────────────────────────────────

func (a *App) cmdGetSubscribedNewsletters(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	newsletters, err := client.GetSubscribedNewsletters(a.ctx)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTERS")
		return
	}

	out := make([]map[string]interface{}, len(newsletters))
	for i, n := range newsletters {
		out[i] = map[string]interface{}{
			"id":   n.ID.String(),
			"name": n.ThreadMeta.Name.Text,
		}
	}
	sendResponse(cmd.ID, out)
}

func (a *App) cmdNewsletterSubscribeLiveUpdates(cmd Command) {
	args, ok := parseArgs[struct {
		JID string `json:"jid"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	jid, err := types.ParseJID(args.JID)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	duration, err := client.NewsletterSubscribeLiveUpdates(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_SUBSCRIBE")
		return
	}
	sendResponse(cmd.ID, map[string]interface{}{
		"durationMs": duration.Milliseconds(),
	})
}

// ── Calls ──────────────────────────────────────────

func (a *App) cmdRejectCall(cmd Command) {
	args, ok := parseArgs[struct {
		From   string `json:"from"`
		CallID string `json:"callId"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	from, err := types.ParseJID(args.From)
	if err != nil {
		sendError(cmd.ID, "invalid JID", "ERR_INVALID_JID")
		return
	}

	err = client.RejectCall(a.ctx, from, args.CallID)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_REJECT_CALL")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Helpers ────────────────────────────────────────

func serializeGroupInfo(g *types.GroupInfo) map[string]interface{} {
	data := map[string]interface{}{
		"jid":       g.JID.String(),
		"name":      g.Name,
		"announce":  g.IsAnnounce,
		"locked":    g.IsLocked,
		"ephemeral": g.IsEphemeral,
	}
	if g.Topic != "" {
		data["description"] = g.Topic
	}
	if g.OwnerJID != (types.JID{}) {
		data["owner"] = g.OwnerJID.String()
	}

	participants := make([]map[string]interface{}, len(g.Participants))
	for i, p := range g.Participants {
		participants[i] = map[string]interface{}{
			"jid":          p.JID.String(),
			"isAdmin":      p.IsAdmin,
			"isSuperAdmin": p.IsSuperAdmin,
		}
	}
	data["participants"] = participants
	return data
}

// buildProtoMessage converts a JSON map to a waE2E.Message.
func buildProtoMessage(m map[string]interface{}) *waProto.Message {
	msg := &waProto.Message{}

	if text, ok := m["conversation"].(string); ok {
		msg.Conversation = proto.String(text)
		return msg
	}

	if ext, ok := m["extendedTextMessage"].(map[string]interface{}); ok {
		etm := &waProto.ExtendedTextMessage{}
		if text, ok := ext["text"].(string); ok {
			etm.Text = proto.String(text)
		}
		msg.ExtendedTextMessage = etm
		return msg
	}

	// Fallback: try "text" field as simple conversation
	if text, ok := m["text"].(string); ok {
		msg.Conversation = proto.String(text)
	}

	return msg
}

// downloadableMsg implements whatsmeow.DownloadableMessage for media downloads.
type downloadableMsg struct {
	directPath    string
	mediaKey      []byte
	fileSHA256    []byte
	fileEncSHA256 []byte
}

func (d *downloadableMsg) GetDirectPath() string   { return d.directPath }
func (d *downloadableMsg) GetMediaKey() []byte      { return d.mediaKey }
func (d *downloadableMsg) GetFileSHA256() []byte    { return d.fileSHA256 }
func (d *downloadableMsg) GetFileEncSHA256() []byte { return d.fileEncSHA256 }

// protoToMap converts a protobuf message to a generic map via protojson round-trip.
func protoToMap(msg interface{}) interface{} {
	if msg == nil {
		return nil
	}
	pm, ok := msg.(proto.Message)
	if !ok {
		return fmt.Sprintf("%v", msg)
	}
	data, err := protojson.MarshalOptions{EmitDefaultValues: false}.Marshal(pm)
	if err != nil {
		return map[string]interface{}{"_error": err.Error()}
	}
	var result interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return map[string]interface{}{"_error": err.Error()}
	}
	return result
}
