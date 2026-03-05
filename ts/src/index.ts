export { WhatsmeowClient } from "./client.js";
export { WhatsmeowError, TimeoutError, NotConnectedError, ProcessExitedError } from "./errors.js";
export type {
  JID,
  MessageInfo,
  SendResponse,
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
  InitResult,
  WhatsmeowEvents,
  ClientOptions,
} from "./types.js";

import { WhatsmeowClient } from "./client.js";
import type { ClientOptions } from "./types.js";

export function createClient(options: ClientOptions): WhatsmeowClient {
  return new WhatsmeowClient(options);
}
