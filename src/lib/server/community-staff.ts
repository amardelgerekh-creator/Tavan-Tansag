import "server-only";
import type { CommunityPatch } from "../community-contract";
import { privateFirestore } from "./firestore-private";
import { staffEmails } from "./staff-policy";
import { createCommunityStaffStore, type CommunityActor, type CommunityListOptions } from "./community-staff-engine";

export function listCommunity(input: CommunityListOptions, actor: CommunityActor) {
  return createCommunityStaffStore({ store: privateFirestore(), allowedEmails: staffEmails() }).list(input, actor);
}
export function updateCommunity(id: string, input: CommunityPatch, actor: CommunityActor) {
  return createCommunityStaffStore({ store: privateFirestore(), allowedEmails: staffEmails() }).update(id, input, actor);
}
