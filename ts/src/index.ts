export { WhatsmeowClient } from "./client.js";
export { WhatsmeowError, TimeoutError, ProcessExitedError } from "./errors.js";
export type {
  JID,
  MessageInfo,
  SendResponse,
  ContextInfo,
  TextMessage,
  ExtendedTextMessage,
  MessageContent,
  GroupParticipant,
  GroupInfo,
  IsOnWhatsAppResult,
  UserInfo,
  ProfilePicture,
  Presence,
  ChatPresence,
  ChatPresenceMedia,
  NewsletterInfo,
  NewsletterMetadata,
  NewsletterMessage,
  BusinessProfile,
  BusinessMessageLinkTarget,
  ContactQRLinkTarget,
  PrivacySettings,
  StatusPrivacyType,
  StatusPrivacy,
  PrivacySettingName,
  PrivacySettingValue,
  Blocklist,
  MediaType,
  UploadResponse,
  NewsletterUploadResponse,
  GroupInfoEvent,
  GroupRequestParticipant,
  SubGroupInfo,
  GroupMemberAddMode,
  ParticipantRequestAction,
  BlocklistAction,
  BotListInfo,
  BotProfileInfo,
  AppStatePatchName,
  InitResult,
  WhatsmeowEvents,
  ClientOptions,
} from "./types.js";

import { WhatsmeowClient } from "./client.js";
import type { ClientOptions } from "./types.js";

export function createClient(options: ClientOptions): WhatsmeowClient {
  return new WhatsmeowClient(options);
}
