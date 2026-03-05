package main

import (
	"os"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// ── Message Operations ────────────────────────────────

// cmdSendReaction sends an emoji reaction to a message.
// Maps to: client.BuildReaction() + client.SendMessage()
func (a *App) cmdSendReaction(cmd Command) {
	args, ok := parseArgs[struct {
		Chat     string `json:"chat"`
		Sender   string `json:"sender"`
		ID       string `json:"id"`
		Reaction string `json:"reaction"` // emoji or "" to remove
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

	msg := client.BuildReaction(chat, sender, args.ID, args.Reaction)
	resp, err := client.SendMessage(a.ctx, chat, msg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SEND")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"id":        resp.ID,
		"timestamp": resp.Timestamp.Unix(),
	})
}

// cmdEditMessage edits a previously sent message.
// Maps to: client.BuildEdit() + client.SendMessage()
func (a *App) cmdEditMessage(cmd Command) {
	args, ok := parseArgs[struct {
		Chat    string                 `json:"chat"`
		ID      string                 `json:"id"`
		Message map[string]interface{} `json:"message"`
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

	newContent := buildProtoMessage(args.Message)
	msg := client.BuildEdit(chat, args.ID, newContent)
	resp, err := client.SendMessage(a.ctx, chat, msg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SEND")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"id":        resp.ID,
		"timestamp": resp.Timestamp.Unix(),
	})
}

// cmdSendPollCreation creates and sends a poll.
// Maps to: client.BuildPollCreation() + client.SendMessage()
func (a *App) cmdSendPollCreation(cmd Command) {
	args, ok := parseArgs[struct {
		JID                  string   `json:"jid"`
		Name                 string   `json:"name"`
		Options              []string `json:"options"`
		SelectableCount      int      `json:"selectableCount"`
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

	msg := client.BuildPollCreation(args.Name, args.Options, args.SelectableCount)
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

// cmdSendPollVote votes on a poll.
// Maps to: client.BuildPollVote() + client.SendMessage()
func (a *App) cmdSendPollVote(cmd Command) {
	args, ok := parseArgs[struct {
		PollChat      string   `json:"pollChat"`
		PollSender    string   `json:"pollSender"`
		PollID        string   `json:"pollId"`
		PollTimestamp int64    `json:"pollTimestamp"`
		Options       []string `json:"options"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	pollChat, err := types.ParseJID(args.PollChat)
	if err != nil {
		sendError(cmd.ID, "invalid poll chat JID", "ERR_INVALID_JID")
		return
	}

	pollSender, err := types.ParseJID(args.PollSender)
	if err != nil {
		sendError(cmd.ID, "invalid poll sender JID", "ERR_INVALID_JID")
		return
	}

	pollInfo := &types.MessageInfo{
		MessageSource: types.MessageSource{
			Chat:   pollChat,
			Sender: pollSender,
		},
		ID:        args.PollID,
		Timestamp: time.Unix(args.PollTimestamp, 0),
	}

	msg, err := client.BuildPollVote(a.ctx, pollInfo, args.Options)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_POLL_VOTE")
		return
	}

	resp, err := client.SendMessage(a.ctx, pollChat, msg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SEND")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"id":        resp.ID,
		"timestamp": resp.Timestamp.Unix(),
	})
}

// ── Advanced Group Operations ─────────────────────────

// cmdSetGroupDescription sets the group description/topic.
// Maps to: client.SetGroupDescription()
func (a *App) cmdSetGroupDescription(cmd Command) {
	args, ok := parseArgs[struct {
		JID         string `json:"jid"`
		Description string `json:"description"`
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

	err = client.SetGroupDescription(a.ctx, jid, args.Description)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_GROUP_DESC")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdGetGroupInfoFromLink gets group info from an invite link without joining.
// Maps to: client.GetGroupInfoFromLink()
func (a *App) cmdGetGroupInfoFromLink(cmd Command) {
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

	info, err := client.GetGroupInfoFromLink(a.ctx, args.Code)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GROUP_INFO")
		return
	}
	sendResponse(cmd.ID, serializeGroupInfo(info))
}

// cmdGetGroupRequestParticipants gets pending join requests for a group.
// Maps to: client.GetGroupRequestParticipants()
func (a *App) cmdGetGroupRequestParticipants(cmd Command) {
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

	requests, err := client.GetGroupRequestParticipants(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GROUP_REQUESTS")
		return
	}

	out := make([]map[string]interface{}, len(requests))
	for i, r := range requests {
		out[i] = map[string]interface{}{
			"jid":         r.JID.String(),
			"requestedAt": r.RequestedAt.Unix(),
		}
	}
	sendResponse(cmd.ID, out)
}

// cmdUpdateGroupRequestParticipants approves or rejects join requests.
// Maps to: client.UpdateGroupRequestParticipants()
func (a *App) cmdUpdateGroupRequestParticipants(cmd Command) {
	args, ok := parseArgs[struct {
		JID          string   `json:"jid"`
		Participants []string `json:"participants"`
		Action       string   `json:"action"` // "approve" or "reject"
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

	var action whatsmeow.ParticipantRequestChange
	switch args.Action {
	case "approve":
		action = whatsmeow.ParticipantChangeApprove
	case "reject":
		action = whatsmeow.ParticipantChangeReject
	default:
		sendError(cmd.ID, "invalid action: "+args.Action+", must be approve or reject", "ERR_INVALID_ARGS")
		return
	}

	_, err = client.UpdateGroupRequestParticipants(a.ctx, jid, pJIDs, action)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UPDATE_REQUESTS")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdSetGroupMemberAddMode controls who can add members to a group.
// Maps to: client.SetGroupMemberAddMode()
func (a *App) cmdSetGroupMemberAddMode(cmd Command) {
	args, ok := parseArgs[struct {
		JID  string `json:"jid"`
		Mode string `json:"mode"` // "admin_add" or "all_member_add"
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

	err = client.SetGroupMemberAddMode(a.ctx, jid, types.GroupMemberAddMode(args.Mode))
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_MEMBER_ADD_MODE")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdSetGroupJoinApprovalMode enables or disables join approval for a group.
// Maps to: client.SetGroupJoinApprovalMode()
func (a *App) cmdSetGroupJoinApprovalMode(cmd Command) {
	args, ok := parseArgs[struct {
		JID     string `json:"jid"`
		Enabled bool   `json:"enabled"`
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

	err = client.SetGroupJoinApprovalMode(a.ctx, jid, args.Enabled)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_JOIN_APPROVAL")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdLinkGroup links a child group to a parent community.
// Maps to: client.LinkGroup()
func (a *App) cmdLinkGroup(cmd Command) {
	args, ok := parseArgs[struct {
		Parent string `json:"parent"`
		Child  string `json:"child"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	parent, err := types.ParseJID(args.Parent)
	if err != nil {
		sendError(cmd.ID, "invalid parent JID", "ERR_INVALID_JID")
		return
	}

	child, err := types.ParseJID(args.Child)
	if err != nil {
		sendError(cmd.ID, "invalid child JID", "ERR_INVALID_JID")
		return
	}

	err = client.LinkGroup(a.ctx, parent, child)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_LINK_GROUP")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdUnlinkGroup unlinks a child group from a parent community.
// Maps to: client.UnlinkGroup()
func (a *App) cmdUnlinkGroup(cmd Command) {
	args, ok := parseArgs[struct {
		Parent string `json:"parent"`
		Child  string `json:"child"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	parent, err := types.ParseJID(args.Parent)
	if err != nil {
		sendError(cmd.ID, "invalid parent JID", "ERR_INVALID_JID")
		return
	}

	child, err := types.ParseJID(args.Child)
	if err != nil {
		sendError(cmd.ID, "invalid child JID", "ERR_INVALID_JID")
		return
	}

	err = client.UnlinkGroup(a.ctx, parent, child)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UNLINK_GROUP")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdGetSubGroups gets sub-groups of a community.
// Maps to: client.GetSubGroups()
func (a *App) cmdGetSubGroups(cmd Command) {
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

	groups, err := client.GetSubGroups(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SUB_GROUPS")
		return
	}

	out := make([]map[string]interface{}, len(groups))
	for i, g := range groups {
		out[i] = map[string]interface{}{
			"jid":            g.JID.String(),
			"name":           g.GroupName.Name,
			"isDefaultSub":   g.GroupIsDefaultSub.IsDefaultSubGroup,
		}
	}
	sendResponse(cmd.ID, out)
}

// cmdGetLinkedGroupsParticipants gets participants across linked groups in a community.
// Maps to: client.GetLinkedGroupsParticipants()
func (a *App) cmdGetLinkedGroupsParticipants(cmd Command) {
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

	participants, err := client.GetLinkedGroupsParticipants(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_LINKED_PARTICIPANTS")
		return
	}

	sendResponse(cmd.ID, serializeJIDs(participants))
}

// ── Newsletter Operations ─────────────────────────────

// cmdCreateNewsletter creates a new newsletter/channel.
// Maps to: client.CreateNewsletter()
func (a *App) cmdCreateNewsletter(cmd Command) {
	args, ok := parseArgs[struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Picture     string `json:"picture"` // optional file path
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	params := whatsmeow.CreateNewsletterParams{
		Name:        args.Name,
		Description: args.Description,
	}

	if args.Picture != "" {
		data, err := os.ReadFile(args.Picture)
		if err != nil {
			sendError(cmd.ID, "failed to read picture: "+err.Error(), "ERR_READ_FILE")
			return
		}
		params.Picture = data
	}

	meta, err := client.CreateNewsletter(a.ctx, params)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_CREATE_NEWSLETTER")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"id":   meta.ID.String(),
		"name": meta.ThreadMeta.Name.Text,
	})
}

// cmdGetNewsletterInfo gets info about a specific newsletter.
// Maps to: client.GetNewsletterInfo()
func (a *App) cmdGetNewsletterInfo(cmd Command) {
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

	meta, err := client.GetNewsletterInfo(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_INFO")
		return
	}

	sendResponse(cmd.ID, serializeNewsletterMeta(meta))
}

// cmdGetNewsletterInfoWithInvite gets newsletter info from an invite link.
// Maps to: client.GetNewsletterInfoWithInvite()
func (a *App) cmdGetNewsletterInfoWithInvite(cmd Command) {
	args, ok := parseArgs[struct {
		Key string `json:"key"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	meta, err := client.GetNewsletterInfoWithInvite(a.ctx, args.Key)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_INFO")
		return
	}

	sendResponse(cmd.ID, serializeNewsletterMeta(meta))
}

// cmdFollowNewsletter follows a newsletter.
// Maps to: client.FollowNewsletter()
func (a *App) cmdFollowNewsletter(cmd Command) {
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

	err = client.FollowNewsletter(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_FOLLOW_NEWSLETTER")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdUnfollowNewsletter unfollows a newsletter.
// Maps to: client.UnfollowNewsletter()
func (a *App) cmdUnfollowNewsletter(cmd Command) {
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

	err = client.UnfollowNewsletter(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UNFOLLOW_NEWSLETTER")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdGetNewsletterMessages gets messages from a newsletter.
// Maps to: client.GetNewsletterMessages()
func (a *App) cmdGetNewsletterMessages(cmd Command) {
	args, ok := parseArgs[struct {
		JID   string `json:"jid"`
		Count int    `json:"count"`
		Since int    `json:"since"` // server ID to start from
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

	params := &whatsmeow.GetNewsletterMessagesParams{
		Count: args.Count,
	}
	if args.Since > 0 {
		since := types.MessageServerID(args.Since)
		params.Before = since
	}

	msgs, err := client.GetNewsletterMessages(a.ctx, jid, params)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_MESSAGES")
		return
	}

	out := make([]map[string]interface{}, len(msgs))
	for i, m := range msgs {
		out[i] = serializeNewsletterMessage(m)
	}
	sendResponse(cmd.ID, out)
}

// cmdNewsletterMarkViewed marks newsletter messages as viewed.
// Maps to: client.NewsletterMarkViewed()
func (a *App) cmdNewsletterMarkViewed(cmd Command) {
	args, ok := parseArgs[struct {
		JID       string `json:"jid"`
		ServerIDs []int  `json:"serverIds"`
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

	serverIDs := make([]types.MessageServerID, len(args.ServerIDs))
	for i, id := range args.ServerIDs {
		serverIDs[i] = types.MessageServerID(id)
	}

	err = client.NewsletterMarkViewed(a.ctx, jid, serverIDs)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_MARK_VIEWED")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdNewsletterSendReaction sends a reaction to a newsletter message.
// Maps to: client.NewsletterSendReaction()
func (a *App) cmdNewsletterSendReaction(cmd Command) {
	args, ok := parseArgs[struct {
		JID       string `json:"jid"`
		ServerID  int    `json:"serverId"`
		Reaction  string `json:"reaction"`
		MessageID string `json:"messageId"`
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

	err = client.NewsletterSendReaction(a.ctx, jid, types.MessageServerID(args.ServerID), args.Reaction, args.MessageID)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_REACTION")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdNewsletterToggleMute mutes or unmutes a newsletter.
// Maps to: client.NewsletterToggleMute()
func (a *App) cmdNewsletterToggleMute(cmd Command) {
	args, ok := parseArgs[struct {
		JID  string `json:"jid"`
		Mute bool   `json:"mute"`
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

	err = client.NewsletterToggleMute(a.ctx, jid, args.Mute)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_MUTE")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── User & Contact Operations ─────────────────────────

// cmdGetUserDevices gets all devices for given users.
// Maps to: client.GetUserDevices()
func (a *App) cmdGetUserDevices(cmd Command) {
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

	devices, err := client.GetUserDevices(a.ctx, jids)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_USER_DEVICES")
		return
	}

	sendResponse(cmd.ID, serializeJIDs(devices))
}

// cmdGetBusinessProfile gets business profile info for a JID.
// Maps to: client.GetBusinessProfile()
func (a *App) cmdGetBusinessProfile(cmd Command) {
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

	profile, err := client.GetBusinessProfile(a.ctx, jid)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_BUSINESS_PROFILE")
		return
	}

	data := map[string]interface{}{
		"jid": profile.JID.String(),
	}
	if profile.Address != "" {
		data["address"] = profile.Address
	}
	if profile.Email != "" {
		data["email"] = profile.Email
	}
	if len(profile.Categories) > 0 {
		cats := make([]map[string]interface{}, len(profile.Categories))
		for i, c := range profile.Categories {
			cats[i] = map[string]interface{}{
				"id":   c.ID,
				"name": c.Name,
			}
		}
		data["categories"] = cats
	}
	sendResponse(cmd.ID, data)
}

// cmdSetStatusMessage sets the account's status message.
// Maps to: client.SetStatusMessage()
func (a *App) cmdSetStatusMessage(cmd Command) {
	args, ok := parseArgs[struct {
		Message string `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	err := client.SetStatusMessage(a.ctx, args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_STATUS")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Privacy & Settings ────────────────────────────────

// cmdGetPrivacySettings gets all privacy settings.
// Maps to: client.GetPrivacySettings()
func (a *App) cmdGetPrivacySettings(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	settings := client.GetPrivacySettings(a.ctx)

	sendResponse(cmd.ID, map[string]interface{}{
		"groupAdd":       string(settings.GroupAdd),
		"lastSeen":       string(settings.LastSeen),
		"status":         string(settings.Status),
		"profile":        string(settings.Profile),
		"readReceipts":   string(settings.ReadReceipts),
		"callAdd":        string(settings.CallAdd),
		"online":         string(settings.Online),
		"messages":       string(settings.Messages),
		"defense":        string(settings.Defense),
		"stickers":       string(settings.Stickers),
	})
}

// cmdSetPrivacySetting updates a privacy setting.
// Maps to: client.SetPrivacySetting()
func (a *App) cmdSetPrivacySetting(cmd Command) {
	args, ok := parseArgs[struct {
		Name  string `json:"name"`
		Value string `json:"value"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	settings, err := client.SetPrivacySetting(a.ctx, types.PrivacySettingType(args.Name), types.PrivacySetting(args.Value))
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_PRIVACY")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"groupAdd":       string(settings.GroupAdd),
		"lastSeen":       string(settings.LastSeen),
		"status":         string(settings.Status),
		"profile":        string(settings.Profile),
		"readReceipts":   string(settings.ReadReceipts),
		"callAdd":        string(settings.CallAdd),
		"online":         string(settings.Online),
		"messages":       string(settings.Messages),
		"defense":        string(settings.Defense),
		"stickers":       string(settings.Stickers),
	})
}

// cmdSetDefaultDisappearingTimer sets the default disappearing message timer.
// Maps to: client.SetDefaultDisappearingTimer()
func (a *App) cmdSetDefaultDisappearingTimer(cmd Command) {
	args, ok := parseArgs[struct {
		Seconds int64 `json:"seconds"` // 0 to disable
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	err := client.SetDefaultDisappearingTimer(a.ctx, time.Duration(args.Seconds)*time.Second)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_DISAPPEARING")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdSetDisappearingTimer sets the disappearing timer for a specific chat.
// Maps to: client.SetDisappearingTimer()
func (a *App) cmdSetDisappearingTimer(cmd Command) {
	args, ok := parseArgs[struct {
		JID     string `json:"jid"`
		Seconds int64  `json:"seconds"` // 0 to disable
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

	err = client.SetDisappearingTimer(a.ctx, jid, time.Duration(args.Seconds)*time.Second, time.Now())
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_DISAPPEARING")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Blocklist ─────────────────────────────────────────

// cmdGetBlocklist gets the list of blocked contacts.
// Maps to: client.GetBlocklist()
func (a *App) cmdGetBlocklist(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	blocklist, err := client.GetBlocklist(a.ctx)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_BLOCKLIST")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"jids": serializeJIDs(blocklist.JIDs),
	})
}

// cmdUpdateBlocklist blocks or unblocks a contact.
// Maps to: client.UpdateBlocklist()
func (a *App) cmdUpdateBlocklist(cmd Command) {
	args, ok := parseArgs[struct {
		JID    string `json:"jid"`
		Action string `json:"action"` // "block" or "unblock"
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

	var action events.BlocklistChangeAction
	switch args.Action {
	case "block":
		action = events.BlocklistChangeActionBlock
	case "unblock":
		action = events.BlocklistChangeActionUnblock
	default:
		sendError(cmd.ID, "invalid action: "+args.Action+", must be block or unblock", "ERR_INVALID_ARGS")
		return
	}

	blocklist, err := client.UpdateBlocklist(a.ctx, jid, action)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UPDATE_BLOCKLIST")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"jids": serializeJIDs(blocklist.JIDs),
	})
}

// ── QR & Link Resolution ──────────────────────────────

// cmdGetContactQRLink generates or revokes a contact QR link.
// Maps to: client.GetContactQRLink()
func (a *App) cmdGetContactQRLink(cmd Command) {
	args, ok := parseArgs[struct {
		Revoke bool `json:"revoke"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	link, err := client.GetContactQRLink(a.ctx, args.Revoke)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_QR_LINK")
		return
	}
	sendResponse(cmd.ID, map[string]interface{}{"link": link})
}

// cmdResolveContactQRLink resolves a contact QR code to user info.
// Maps to: client.ResolveContactQRLink()
func (a *App) cmdResolveContactQRLink(cmd Command) {
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

	target, err := client.ResolveContactQRLink(a.ctx, args.Code)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_RESOLVE_QR")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"jid":      target.JID.String(),
		"type":     target.Type,
		"pushName": target.PushName,
	})
}

// cmdResolveBusinessMessageLink resolves a business message link.
// Maps to: client.ResolveBusinessMessageLink()
func (a *App) cmdResolveBusinessMessageLink(cmd Command) {
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

	target, err := client.ResolveBusinessMessageLink(a.ctx, args.Code)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_RESOLVE_BIZ_LINK")
		return
	}

	data := map[string]interface{}{
		"jid":      target.JID.String(),
		"pushName": target.PushName,
		"message":  target.Message,
	}
	if target.VerifiedName != "" {
		data["verifiedName"] = target.VerifiedName
	}
	sendResponse(cmd.ID, data)
}

// ── Media Upload ──────────────────────────────────────

// cmdUploadMedia uploads media for sending.
// Maps to: client.Upload()
func (a *App) cmdUploadMedia(cmd Command) {
	args, ok := parseArgs[struct {
		Path      string `json:"path"`
		MediaType string `json:"mediaType"` // "image", "video", "audio", "document"
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	data, err := os.ReadFile(args.Path)
	if err != nil {
		sendError(cmd.ID, "failed to read file: "+err.Error(), "ERR_READ_FILE")
		return
	}

	var mediaType whatsmeow.MediaType
	switch args.MediaType {
	case "image":
		mediaType = whatsmeow.MediaImage
	case "video":
		mediaType = whatsmeow.MediaVideo
	case "audio":
		mediaType = whatsmeow.MediaAudio
	case "document":
		mediaType = whatsmeow.MediaDocument
	default:
		sendError(cmd.ID, "invalid media type: "+args.MediaType, "ERR_INVALID_ARGS")
		return
	}

	resp, err := client.Upload(a.ctx, data, mediaType)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UPLOAD")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"url":            resp.URL,
		"directPath":     resp.DirectPath,
		"mediaKey":       resp.MediaKey,
		"fileEncSha256":  resp.FileEncSHA256,
		"fileSha256":     resp.FileSHA256,
		"fileLength":     resp.FileLength,
	})
}

// ── Configuration ─────────────────────────────────────

// cmdSetPassive sets passive mode.
// Maps to: client.SetPassive()
func (a *App) cmdSetPassive(cmd Command) {
	args, ok := parseArgs[struct {
		Passive bool `json:"passive"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	err := client.SetPassive(a.ctx, args.Passive)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SET_PASSIVE")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdSetForceActiveDeliveryReceipts sets whether to force active delivery receipts.
// Maps to: client.SetForceActiveDeliveryReceipts()
func (a *App) cmdSetForceActiveDeliveryReceipts(cmd Command) {
	args, ok := parseArgs[struct {
		Active bool `json:"active"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	client.SetForceActiveDeliveryReceipts(args.Active)
	sendResponse(cmd.ID, nil)
}

// ── Serialization Helpers ─────────────────────────────

func serializeNewsletterMeta(meta *types.NewsletterMetadata) map[string]interface{} {
	data := map[string]interface{}{
		"id":    meta.ID.String(),
		"state": string(meta.State.Type),
	}
	if meta.ThreadMeta.Name.Text != "" {
		data["name"] = meta.ThreadMeta.Name.Text
	}
	if meta.ThreadMeta.Description.Text != "" {
		data["description"] = meta.ThreadMeta.Description.Text
	}
	if meta.ThreadMeta.Picture != nil {
		data["pictureUrl"] = meta.ThreadMeta.Picture.URL
	}
	if meta.ViewerMeta != nil {
		data["role"] = string(meta.ViewerMeta.Role)
		data["mute"] = string(meta.ViewerMeta.Mute)
	}
	return data
}

func serializeNewsletterMessage(m *types.NewsletterMessage) map[string]interface{} {
	data := map[string]interface{}{
		"serverId":   m.MessageServerID,
		"timestamp":  m.Timestamp.Unix(),
		"viewsCount": m.ViewsCount,
	}
	if m.Message != nil {
		data["message"] = protoToMap(m.Message)
	}
	if len(m.ReactionCounts) > 0 {
		reactions := make([]map[string]interface{}, 0, len(m.ReactionCounts))
		for emoji, count := range m.ReactionCounts {
			reactions = append(reactions, map[string]interface{}{
				"reaction": emoji,
				"count":    count,
			})
		}
		data["reactions"] = reactions
	}
	return data
}

