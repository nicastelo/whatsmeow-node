package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/appstate"
	waProto "go.mau.fi/whatsmeow/proto/waE2E"
	waWeb "go.mau.fi/whatsmeow/proto/waWeb"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

func privacySettingsToMap(settings types.PrivacySettings) map[string]interface{} {
	return map[string]interface{}{
		"groupAdd":     string(settings.GroupAdd),
		"lastSeen":     string(settings.LastSeen),
		"status":       string(settings.Status),
		"profile":      string(settings.Profile),
		"readReceipts": string(settings.ReadReceipts),
		"callAdd":      string(settings.CallAdd),
		"online":       string(settings.Online),
		"messages":     string(settings.Messages),
		"defense":      string(settings.Defense),
		"stickers":     string(settings.Stickers),
	}
}

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

	newContent, err := buildProtoMessage(args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}
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
		JID             string   `json:"jid"`
		Name            string   `json:"name"`
		Options         []string `json:"options"`
		SelectableCount int      `json:"selectableCount"`
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

	switch args.Mode {
	case "admin_add", "all_member_add":
	default:
		sendError(cmd.ID, "invalid mode: must be \"admin_add\" or \"all_member_add\"", "ERR_INVALID_ARGS")
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
			"jid":          g.JID.String(),
			"name":         g.GroupName.Name,
			"isDefaultSub": g.GroupIsDefaultSub.IsDefaultSubGroup,
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
		JID    string `json:"jid"`
		Count  int    `json:"count"`
		Before int    `json:"before"` // fetch messages before this server ID (for backward pagination)
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
	if args.Before > 0 {
		params.Before = types.MessageServerID(args.Before)
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
	if len(profile.ProfileOptions) > 0 {
		data["profileOptions"] = profile.ProfileOptions
	}
	if profile.BusinessHoursTimeZone != "" {
		data["businessHoursTimeZone"] = profile.BusinessHoursTimeZone
	}
	if len(profile.BusinessHours) > 0 {
		hours := make([]map[string]interface{}, len(profile.BusinessHours))
		for i, h := range profile.BusinessHours {
			hours[i] = map[string]interface{}{
				"dayOfWeek": h.DayOfWeek,
				"mode":      h.Mode,
				"openTime":  h.OpenTime,
				"closeTime": h.CloseTime,
			}
		}
		data["businessHours"] = hours
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
	sendResponse(cmd.ID, privacySettingsToMap(settings))
}

// cmdTryFetchPrivacySettings fetches privacy settings from cache or server.
// Maps to: client.TryFetchPrivacySettings()
func (a *App) cmdTryFetchPrivacySettings(cmd Command) {
	args := struct {
		IgnoreCache bool `json:"ignoreCache"`
	}{}
	if len(cmd.Args) > 0 {
		if err := json.Unmarshal(cmd.Args, &args); err != nil {
			sendError(cmd.ID, "invalid args: "+err.Error(), "ERR_INVALID_ARGS")
			return
		}
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	settings, err := client.TryFetchPrivacySettings(a.ctx, args.IgnoreCache)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GET_PRIVACY")
		return
	}

	sendResponse(cmd.ID, privacySettingsToMap(*settings))
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
	sendResponse(cmd.ID, privacySettingsToMap(settings))
}

// cmdGetStatusPrivacy gets current status audience rules.
// Maps to: client.GetStatusPrivacy()
func (a *App) cmdGetStatusPrivacy(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	statusPrivacy, err := client.GetStatusPrivacy(a.ctx)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GET_STATUS_PRIVACY")
		return
	}

	rules := make([]map[string]interface{}, 0, len(statusPrivacy))
	for _, rule := range statusPrivacy {
		list := make([]string, 0, len(rule.List))
		for _, jid := range rule.List {
			list = append(list, jid.String())
		}

		rules = append(rules, map[string]interface{}{
			"type":      string(rule.Type),
			"list":      list,
			"isDefault": rule.IsDefault,
		})
	}

	sendResponse(cmd.ID, rules)
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
		"jid":           target.JID.String(),
		"pushName":      target.PushName,
		"message":       target.Message,
		"isSigned":      target.IsSigned,
		"verifiedLevel": target.VerifiedLevel,
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

	file, err := os.Open(args.Path)
	if err != nil {
		sendError(cmd.ID, "failed to read file: "+err.Error(), "ERR_READ_FILE")
		return
	}
	defer file.Close()

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

	resp, err := client.UploadReader(a.ctx, file, nil, mediaType)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UPLOAD")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"URL":            resp.URL,
		"directPath":     resp.DirectPath,
		"mediaKey":       resp.MediaKey,
		"fileEncSHA256":  resp.FileEncSHA256,
		"fileSHA256":     resp.FileSHA256,
		"fileLength":     resp.FileLength,
	})
}

// cmdDeleteMedia deletes media from WhatsApp servers.
// Maps to: client.DeleteMedia()
func (a *App) cmdDeleteMedia(cmd Command) {
	args, ok := parseArgs[struct {
		MediaType   string `json:"mediaType"` // "image", "video", "audio", "document"
		DirectPath  string `json:"directPath"`
		EncFileHash []byte `json:"encFileHash"`
		EncHandle   string `json:"encHandle"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
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

	err := client.DeleteMedia(a.ctx, mediaType, args.DirectPath, args.EncFileHash, args.EncHandle)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_DELETE_MEDIA")
		return
	}
	sendResponse(cmd.ID, nil)
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
		// Collect and sort by emoji for deterministic output
		emojis := make([]string, 0, len(m.ReactionCounts))
		for emoji := range m.ReactionCounts {
			emojis = append(emojis, emoji)
		}
		sort.Strings(emojis)
		reactions := make([]map[string]interface{}, 0, len(m.ReactionCounts))
		for _, emoji := range emojis {
			reactions = append(reactions, map[string]interface{}{
				"reaction": emoji,
				"count":    m.ReactionCounts[emoji],
			})
		}
		data["reactions"] = reactions
	}
	return data
}

// ── Newsletter Updates & TOS ──────────────────────────

// cmdAcceptTOSNotice accepts a Terms of Service notice.
// Maps to: client.AcceptTOSNotice()
func (a *App) cmdAcceptTOSNotice(cmd Command) {
	args, ok := parseArgs[struct {
		NoticeID string `json:"noticeId"`
		Stage    string `json:"stage"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	err := client.AcceptTOSNotice(a.ctx, args.NoticeID, args.Stage)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_ACCEPT_TOS")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdGetNewsletterMessageUpdates gets message updates for a newsletter.
// Maps to: client.GetNewsletterMessageUpdates()
func (a *App) cmdGetNewsletterMessageUpdates(cmd Command) {
	args, ok := parseArgs[struct {
		JID   string `json:"jid"`
		Count int    `json:"count"`
		Since int64  `json:"since"` // unix timestamp, 0 = omit
		After int    `json:"after"` // server message ID, 0 = omit
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

	params := &whatsmeow.GetNewsletterUpdatesParams{
		Count: args.Count,
	}
	if args.Since > 0 {
		params.Since = time.Unix(args.Since, 0)
	}
	if args.After > 0 {
		params.After = types.MessageServerID(args.After)
	}

	msgs, err := client.GetNewsletterMessageUpdates(a.ctx, jid, params)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_NEWSLETTER_UPDATES")
		return
	}

	out := make([]map[string]interface{}, len(msgs))
	for i, m := range msgs {
		out[i] = serializeNewsletterMessage(m)
	}
	sendResponse(cmd.ID, out)
}

// ── Group Invite Operations ───────────────────────────

// cmdGetGroupInfoFromInvite gets group info using a direct invite.
// Maps to: client.GetGroupInfoFromInvite()
func (a *App) cmdGetGroupInfoFromInvite(cmd Command) {
	args, ok := parseArgs[struct {
		JID        string `json:"jid"`
		Inviter    string `json:"inviter"`
		Code       string `json:"code"`
		Expiration int64  `json:"expiration"`
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

	inviter, err := types.ParseJID(args.Inviter)
	if err != nil {
		sendError(cmd.ID, "invalid inviter JID", "ERR_INVALID_JID")
		return
	}

	info, err := client.GetGroupInfoFromInvite(a.ctx, jid, inviter, args.Code, args.Expiration)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_GROUP_INFO")
		return
	}
	sendResponse(cmd.ID, serializeGroupInfo(info))
}

// cmdJoinGroupWithInvite joins a group using a direct invite.
// Maps to: client.JoinGroupWithInvite()
func (a *App) cmdJoinGroupWithInvite(cmd Command) {
	args, ok := parseArgs[struct {
		JID        string `json:"jid"`
		Inviter    string `json:"inviter"`
		Code       string `json:"code"`
		Expiration int64  `json:"expiration"`
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

	inviter, err := types.ParseJID(args.Inviter)
	if err != nil {
		sendError(cmd.ID, "invalid inviter JID", "ERR_INVALID_JID")
		return
	}

	err = client.JoinGroupWithInvite(a.ctx, jid, inviter, args.Code, args.Expiration)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_JOIN_GROUP")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Newsletter Upload ─────────────────────────────────

// cmdUploadNewsletter uploads media for newsletter messages.
// Maps to: client.UploadNewsletterReader()
func (a *App) cmdUploadNewsletter(cmd Command) {
	args, ok := parseArgs[struct {
		Path      string `json:"path"`
		MediaType string `json:"mediaType"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	file, err := os.Open(args.Path)
	if err != nil {
		sendError(cmd.ID, "failed to read file: "+err.Error(), "ERR_READ_FILE")
		return
	}
	defer file.Close()

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

	resp, err := client.UploadNewsletterReader(a.ctx, file, mediaType)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_UPLOAD")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"URL":           resp.URL,
		"directPath":    resp.DirectPath,
		"mediaKey":      resp.MediaKey,
		"fileEncSHA256": resp.FileEncSHA256,
		"fileSHA256":    resp.FileSHA256,
		"fileLength":    resp.FileLength,
	})
}

// ── Download Any ──────────────────────────────────────

// cmdDownloadAny downloads media from any message type by auto-detecting the media field.
// Maps to: client.DownloadAny()
func (a *App) cmdDownloadAny(cmd Command) {
	args, ok := parseArgs[struct {
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	msg, err := buildProtoMessage(args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	data, err := client.DownloadAny(a.ctx, msg)
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

// ── Connection Internals ──────────────────────────────

// cmdResetConnection resets the WebSocket connection.
// Maps to: client.ResetConnection()
func (a *App) cmdResetConnection(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}
	client.ResetConnection()
	sendResponse(cmd.ID, nil)
}

// ── Message Helpers ───────────────────────────────────

// cmdGenerateMessageID generates a unique message ID.
// Maps to: client.GenerateMessageID()
func (a *App) cmdGenerateMessageID(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}
	id := client.GenerateMessageID()
	sendResponse(cmd.ID, map[string]interface{}{"id": string(id)})
}

// cmdBuildMessageKey builds a message key proto.
// Maps to: client.BuildMessageKey()
func (a *App) cmdBuildMessageKey(cmd Command) {
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

	key := client.BuildMessageKey(chat, sender, args.ID)
	sendResponse(cmd.ID, protoToMap(key))
}

// cmdBuildUnavailableMessageRequest builds a request for unavailable messages.
// Maps to: client.BuildUnavailableMessageRequest()
func (a *App) cmdBuildUnavailableMessageRequest(cmd Command) {
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

	msg := client.BuildUnavailableMessageRequest(chat, sender, args.ID)
	sendResponse(cmd.ID, protoToMap(msg))
}

// cmdBuildHistorySyncRequest builds a history sync request message.
// Maps to: client.BuildHistorySyncRequest()
func (a *App) cmdBuildHistorySyncRequest(cmd Command) {
	args, ok := parseArgs[struct {
		Info  map[string]interface{} `json:"info"`
		Count int                    `json:"count"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	info, err := parseMessageInfo(args.Info)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	msg := client.BuildHistorySyncRequest(&info, args.Count)
	sendResponse(cmd.ID, protoToMap(msg))
}

// cmdSendPeerMessage sends a message to own devices.
// Maps to: client.SendPeerMessage()
func (a *App) cmdSendPeerMessage(cmd Command) {
	args, ok := parseArgs[struct {
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	msg, err := buildProtoMessage(args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	resp, err := client.SendPeerMessage(a.ctx, msg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SEND")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"id":        resp.ID,
		"timestamp": resp.Timestamp.Unix(),
	})
}

// cmdSendMediaRetryReceipt requests a re-upload of media from the sender.
// Maps to: client.SendMediaRetryReceipt()
func (a *App) cmdSendMediaRetryReceipt(cmd Command) {
	args, ok := parseArgs[struct {
		Info     map[string]interface{} `json:"info"`
		MediaKey []byte                 `json:"mediaKey"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	info, err := parseMessageInfo(args.Info)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	err = client.SendMediaRetryReceipt(a.ctx, &info, args.MediaKey)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_SEND")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Download Variants ─────────────────────────────────

// cmdDownloadMediaWithPath downloads media using direct path and keys.
// Maps to: client.DownloadMediaWithPath()
func (a *App) cmdDownloadMediaWithPath(cmd Command) {
	args, ok := parseArgs[struct {
		DirectPath  string `json:"directPath"`
		EncFileHash []byte `json:"encFileHash"`
		FileHash    []byte `json:"fileHash"`
		MediaKey    []byte `json:"mediaKey"`
		FileLength  int    `json:"fileLength"`
		MediaType   string `json:"mediaType"`
		MmsType     string `json:"mmsType"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
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

	data, err := client.DownloadMediaWithPath(a.ctx, args.DirectPath, args.EncFileHash, args.FileHash, args.MediaKey, args.FileLength, mediaType, args.MmsType)
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

	sendResponse(cmd.ID, map[string]interface{}{"path": tmpFile.Name()})
}

// ── Bot APIs ──────────────────────────────────────────

// cmdGetBotListV2 gets the list of available bots.
// Maps to: client.GetBotListV2()
func (a *App) cmdGetBotListV2(cmd Command) {
	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	bots, err := client.GetBotListV2(a.ctx)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_BOT_LIST")
		return
	}

	out := make([]map[string]interface{}, len(bots))
	for i, b := range bots {
		out[i] = map[string]interface{}{
			"botJid":    b.BotJID.String(),
			"personaId": b.PersonaID,
		}
	}
	sendResponse(cmd.ID, out)
}

// cmdGetBotProfiles gets profiles for bots.
// Maps to: client.GetBotProfiles()
func (a *App) cmdGetBotProfiles(cmd Command) {
	args, ok := parseArgs[struct {
		Bots []struct {
			BotJID    string `json:"botJid"`
			PersonaID string `json:"personaId"`
		} `json:"bots"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	botInfos := make([]types.BotListInfo, len(args.Bots))
	for i, b := range args.Bots {
		jid, err := types.ParseJID(b.BotJID)
		if err != nil {
			sendError(cmd.ID, "invalid bot JID: "+b.BotJID, "ERR_INVALID_JID")
			return
		}
		botInfos[i] = types.BotListInfo{BotJID: jid, PersonaID: b.PersonaID}
	}

	profiles, err := client.GetBotProfiles(a.ctx, botInfos)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_BOT_PROFILES")
		return
	}

	out := make([]map[string]interface{}, len(profiles))
	for i, p := range profiles {
		profile := map[string]interface{}{
			"jid":                 p.JID.String(),
			"name":                p.Name,
			"description":         p.Description,
			"category":            p.Category,
			"isDefault":           p.IsDefault,
			"personaId":           p.PersonaID,
			"commandsDescription": p.CommandsDescription,
		}
		if p.Attributes != "" {
			profile["attributes"] = p.Attributes
		}
		if len(p.Prompts) > 0 {
			profile["prompts"] = p.Prompts
		}
		if len(p.Commands) > 0 {
			cmdsJSON, _ := json.Marshal(p.Commands)
			var cmds interface{}
			_ = json.Unmarshal(cmdsJSON, &cmds)
			profile["commands"] = cmds
		}
		out[i] = profile
	}
	sendResponse(cmd.ID, out)
}

// ── App State ─────────────────────────────────────────

// cmdFetchAppState fetches app state from the server.
// Maps to: client.FetchAppState()
func (a *App) cmdFetchAppState(cmd Command) {
	args, ok := parseArgs[struct {
		Name             string `json:"name"`
		FullSync         bool   `json:"fullSync"`
		OnlyIfNotSynced  bool   `json:"onlyIfNotSynced"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	err := client.FetchAppState(a.ctx, appstate.WAPatchName(args.Name), args.FullSync, args.OnlyIfNotSynced)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_FETCH_APP_STATE")
		return
	}
	sendResponse(cmd.ID, nil)
}

// cmdMarkNotDirty marks an app state patch as not dirty.
// Maps to: client.MarkNotDirty()
func (a *App) cmdMarkNotDirty(cmd Command) {
	args, ok := parseArgs[struct {
		CleanType string `json:"cleanType"`
		Timestamp int64  `json:"timestamp"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	ts := time.Unix(args.Timestamp, 0)
	err := client.MarkNotDirty(a.ctx, args.CleanType, ts)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_MARK_NOT_DIRTY")
		return
	}
	sendResponse(cmd.ID, nil)
}

// ── Decrypt/Encrypt ───────────────────────────────────

// cmdDecryptComment decrypts a comment message.
// Maps to: client.DecryptComment()
func (a *App) cmdDecryptComment(cmd Command) {
	args, ok := parseArgs[struct {
		Info    map[string]interface{} `json:"info"`
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	evt, err := parseEventsMessage(args.Info, args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	decrypted, err := client.DecryptComment(a.ctx, evt)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_DECRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(decrypted))
}

// cmdDecryptPollVote decrypts a poll vote message.
// Maps to: client.DecryptPollVote()
func (a *App) cmdDecryptPollVote(cmd Command) {
	args, ok := parseArgs[struct {
		Info    map[string]interface{} `json:"info"`
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	evt, err := parseEventsMessage(args.Info, args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	decrypted, err := client.DecryptPollVote(a.ctx, evt)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_DECRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(decrypted))
}

// cmdDecryptReaction decrypts a reaction message.
// Maps to: client.DecryptReaction()
func (a *App) cmdDecryptReaction(cmd Command) {
	args, ok := parseArgs[struct {
		Info    map[string]interface{} `json:"info"`
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	evt, err := parseEventsMessage(args.Info, args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	decrypted, err := client.DecryptReaction(a.ctx, evt)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_DECRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(decrypted))
}

// cmdDecryptSecretEncryptedMessage decrypts a secret encrypted message.
// Maps to: client.DecryptSecretEncryptedMessage()
func (a *App) cmdDecryptSecretEncryptedMessage(cmd Command) {
	args, ok := parseArgs[struct {
		Info    map[string]interface{} `json:"info"`
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	evt, err := parseEventsMessage(args.Info, args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	decrypted, err := client.DecryptSecretEncryptedMessage(a.ctx, evt)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_DECRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(decrypted))
}

// cmdEncryptComment encrypts a comment for a message.
// Maps to: client.EncryptComment()
func (a *App) cmdEncryptComment(cmd Command) {
	args, ok := parseArgs[struct {
		Info    map[string]interface{} `json:"info"`
		Message map[string]interface{} `json:"message"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	info, err := parseMessageInfo(args.Info)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	msg, err := buildProtoMessage(args.Message)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	encrypted, err := client.EncryptComment(a.ctx, &info, msg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_ENCRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(encrypted))
}

// cmdEncryptPollVote encrypts a poll vote.
// Maps to: client.EncryptPollVote()
func (a *App) cmdEncryptPollVote(cmd Command) {
	args, ok := parseArgs[struct {
		Info map[string]interface{} `json:"info"`
		Vote map[string]interface{} `json:"vote"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	info, err := parseMessageInfo(args.Info)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	vote := &waProto.PollVoteMessage{}
	if err := unmarshalProtoJSON(args.Vote, vote); err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	encrypted, err := client.EncryptPollVote(a.ctx, &info, vote)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_ENCRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(encrypted))
}

// cmdEncryptReaction encrypts a reaction.
// Maps to: client.EncryptReaction()
func (a *App) cmdEncryptReaction(cmd Command) {
	args, ok := parseArgs[struct {
		Info     map[string]interface{} `json:"info"`
		Reaction map[string]interface{} `json:"reaction"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	info, err := parseMessageInfo(args.Info)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	reaction := &waProto.ReactionMessage{}
	if err := unmarshalProtoJSON(args.Reaction, reaction); err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	encrypted, err := client.EncryptReaction(a.ctx, &info, reaction)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_ENCRYPT")
		return
	}
	sendResponse(cmd.ID, protoToMap(encrypted))
}

// ── Web Message Parsing ───────────────────────────────

// cmdParseWebMessage parses a WebMessageInfo (from history sync) into a message event.
// Maps to: client.ParseWebMessage()
func (a *App) cmdParseWebMessage(cmd Command) {
	args, ok := parseArgs[struct {
		ChatJID string                 `json:"chatJid"`
		WebMsg  map[string]interface{} `json:"webMsg"`
	}](cmd)
	if !ok {
		return
	}

	client := a.requireClient(cmd)
	if client == nil {
		return
	}

	chatJID, err := types.ParseJID(args.ChatJID)
	if err != nil {
		sendError(cmd.ID, "invalid chat JID", "ERR_INVALID_JID")
		return
	}

	webMsg := &waWeb.WebMessageInfo{}
	if err := unmarshalProtoJSON(args.WebMsg, webMsg); err != nil {
		sendError(cmd.ID, err.Error(), "ERR_INVALID_ARGS")
		return
	}

	evt, err := client.ParseWebMessage(chatJID, webMsg)
	if err != nil {
		sendError(cmd.ID, err.Error(), "ERR_PARSE")
		return
	}

	sendResponse(cmd.ID, map[string]interface{}{
		"info":    serializeMessageInfo(evt.Info),
		"message": protoToMap(evt.Message),
	})
}

// ── Helpers ───────────────────────────────────────────

// parseMessageInfo reconstructs a types.MessageInfo from a JSON map.
func parseMessageInfo(raw map[string]interface{}) (types.MessageInfo, error) {
	info := types.MessageInfo{}
	if chat, ok := raw["chat"].(string); ok {
		parsed, err := types.ParseJID(chat)
		if err != nil {
			return info, fmt.Errorf("invalid chat JID: %w", err)
		}
		info.Chat = parsed
	}
	if sender, ok := raw["sender"].(string); ok {
		parsed, err := types.ParseJID(sender)
		if err != nil {
			return info, fmt.Errorf("invalid sender JID: %w", err)
		}
		info.Sender = parsed
	}
	if id, ok := raw["id"].(string); ok {
		info.ID = id
	}
	if isFromMe, ok := raw["isFromMe"].(bool); ok {
		info.IsFromMe = isFromMe
	}
	if isGroup, ok := raw["isGroup"].(bool); ok {
		info.IsGroup = isGroup
	}
	if ts, ok := raw["timestamp"].(float64); ok {
		info.Timestamp = time.Unix(int64(ts), 0)
	}
	if pushName, ok := raw["pushName"].(string); ok {
		info.PushName = pushName
	}
	return info, nil
}

// parseEventsMessage reconstructs an events.Message from info + message JSON maps.
func parseEventsMessage(infoRaw, messageRaw map[string]interface{}) (*events.Message, error) {
	info, err := parseMessageInfo(infoRaw)
	if err != nil {
		return nil, err
	}
	msg, err := buildProtoMessage(messageRaw)
	if err != nil {
		return nil, err
	}
	return &events.Message{Info: info, Message: msg}, nil
}

// unmarshalProtoJSON unmarshals a JSON map into a protobuf message.
func unmarshalProtoJSON(m map[string]interface{}, target proto.Message) error {
	data, err := json.Marshal(m)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}
	return protojson.Unmarshal(data, target)
}
