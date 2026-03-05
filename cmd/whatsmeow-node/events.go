package main

import (
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// eventHandler is registered on the whatsmeow client to forward events as JSON.
func (a *App) eventHandler(evt interface{}) {
	switch v := evt.(type) {

	// ── Connection ─────────────────────────────────
	case *events.Connected:
		jid := ""
		a.mu.Lock()
		if a.client != nil && a.client.Store != nil && a.client.Store.ID != nil {
			jid = a.client.Store.ID.String()
		}
		a.mu.Unlock()
		sendEvent("connected", map[string]interface{}{"jid": jid})

	case *events.Disconnected:
		sendEvent("disconnected", map[string]interface{}{})

	case *events.LoggedOut:
		sendEvent("logged_out", map[string]interface{}{
			"reason": v.Reason.String(),
		})

	case *events.StreamError:
		sendEvent("stream_error", map[string]interface{}{
			"code": v.Code,
		})

	case *events.TemporaryBan:
		sendEvent("temporary_ban", map[string]interface{}{
			"code":   v.Code.String(),
			"expire": v.Expire.String(),
		})

	case *events.KeepAliveTimeout:
		sendEvent("keep_alive_timeout", map[string]interface{}{
			"errorCount": v.ErrorCount,
		})

	case *events.KeepAliveRestored:
		sendEvent("keep_alive_restored", map[string]interface{}{})

	// ── Messages ──────────────────────────────────
	case *events.Message:
		sendEvent("message", map[string]interface{}{
			"info":    serializeMessageInfo(v.Info),
			"message": protoToMap(v.Message),
		})

	case *events.Receipt:
		sendEvent("message:receipt", map[string]interface{}{
			"type":      string(v.Type),
			"chat":      v.MessageSource.Chat.String(),
			"sender":    v.MessageSource.Sender.String(),
			"isGroup":   v.MessageSource.IsGroup,
			"ids":       v.MessageIDs,
			"timestamp": v.Timestamp.Unix(),
		})

	case *events.ChatPresence:
		sendEvent("chat_presence", map[string]interface{}{
			"chat":   v.MessageSource.Chat.String(),
			"sender": v.MessageSource.Sender.String(),
			"state":  string(v.State),
			"media":  string(v.Media),
		})

	case *events.Presence:
		pres := "available"
		if v.Unavailable {
			pres = "unavailable"
		}
		data := map[string]interface{}{
			"jid":      v.From.String(),
			"presence": pres,
		}
		if !v.LastSeen.IsZero() {
			data["lastSeen"] = v.LastSeen.Unix()
		}
		sendEvent("presence", data)

	// ── Groups ────────────────────────────────────
	case *events.GroupInfo:
		data := map[string]interface{}{
			"jid": v.JID.String(),
		}
		if v.Name != nil {
			data["name"] = v.Name.Name
		}
		if v.Topic != nil {
			data["description"] = v.Topic.Topic
		}
		if v.Announce != nil {
			data["announce"] = v.Announce.IsAnnounce
		}
		if v.Locked != nil {
			data["locked"] = v.Locked.IsLocked
		}
		if v.Ephemeral != nil {
			data["ephemeral"] = v.Ephemeral.IsEphemeral
		}
		if len(v.Join) > 0 {
			data["join"] = serializeJIDs(v.Join)
		}
		if len(v.Leave) > 0 {
			data["leave"] = serializeJIDs(v.Leave)
		}
		if len(v.Promote) > 0 {
			data["promote"] = serializeJIDs(v.Promote)
		}
		if len(v.Demote) > 0 {
			data["demote"] = serializeJIDs(v.Demote)
		}
		sendEvent("group:info", data)

	case *events.JoinedGroup:
		sendEvent("group:joined", map[string]interface{}{
			"jid":  v.JID.String(),
			"name": v.GroupName.Name,
		})

	case *events.Picture:
		data := map[string]interface{}{
			"jid":    v.JID.String(),
			"remove": v.Remove,
		}
		if v.PictureID != "" {
			data["pictureId"] = v.PictureID
		}
		sendEvent("picture", data)

	// ── Calls ─────────────────────────────────────
	case *events.CallOffer:
		sendEvent("call:offer", map[string]interface{}{
			"from":   v.CallCreator.String(),
			"callId": v.CallID,
		})

	case *events.CallAccept:
		sendEvent("call:accept", map[string]interface{}{
			"from":   v.CallCreator.String(),
			"callId": v.CallID,
		})

	case *events.CallTerminate:
		sendEvent("call:terminate", map[string]interface{}{
			"from":   v.CallCreator.String(),
			"callId": v.CallID,
			"reason": v.Reason,
		})

	// ── Identity / Push Name ─────────────────────
	case *events.IdentityChange:
		sendEvent("identity_change", map[string]interface{}{
			"jid":       v.JID.String(),
			"timestamp": v.Timestamp.Unix(),
		})

	// ── History Sync ─────────────────────────────
	case *events.HistorySync:
		sendEvent("history_sync", map[string]interface{}{
			"type": v.Data.GetSyncType().String(),
		})
	}
}

// ── Serialization helpers ────────────────────────────

func serializeMessageInfo(info types.MessageInfo) map[string]interface{} {
	return map[string]interface{}{
		"id":        info.ID,
		"chat":      info.Chat.String(),
		"sender":    info.Sender.String(),
		"isFromMe":  info.IsFromMe,
		"isGroup":   info.IsGroup,
		"timestamp": info.Timestamp.Unix(),
		"pushName":  info.PushName,
	}
}

func serializeJIDs(jids []types.JID) []string {
	result := make([]string, len(jids))
	for i, jid := range jids {
		result[i] = jid.String()
	}
	return result
}
