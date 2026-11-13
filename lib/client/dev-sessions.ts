/**
 * DEV FIXTURE: signed-in sessions shown in Settings > Security. There is no
 * Client sign-in yet, so these are illustrative rows only; nothing here is a
 * real session and no action on them changes anything. Replace with the auth
 * provider's session list when Client sign-in is connected.
 */
export type DevSession = { id: string; device: string; detail: string; current: boolean };

export const DEV_ACTIVE_SESSIONS: DevSession[] = [
  { id: "s1", device: "Windows · Chrome", detail: "Current session", current: true },
  { id: "s2", device: "iPhone · Safari", detail: "Last active 2 days ago", current: false },
];
