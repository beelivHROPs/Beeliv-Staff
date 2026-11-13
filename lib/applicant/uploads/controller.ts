/**
 * Drives the three upload slots: validate, request, send bytes, complete, then (optionally) read status.
 * Framework-free so it can be tested in node; the React hook (use-upload-slot.ts) only subscribes.
 *
 * It lives at module level (not inside a component) so an upload keeps going when the person moves
 * to another step of the application. Rules it keeps:
 *  - requestId comes from crypto.randomUUID and is created once per attempt.
 *  - An uncertain outcome (lost reply, interrupted, unavailable) keeps the original ids. Retry reuses
 *    them. A new id is only ever created by the person starting over (a fresh pick or startOver()).
 *  - The signed uploadUrl is held in a local variable for the one PUT. It is never in state or storage.
 *  - The browser never reports clean, verified or accepted. "checking" is the most it can say alone.
 */
import { checkFileMeta, extensionOf, signatureMatches } from "./policy";
import { IDLE, attemptOf, isBusy, persistStage, transition } from "./state";
import { browserSessionStore, clearPersisted, loadPersisted, savePersisted, type KeyValueStore } from "./storage";
import type { UploadTransport } from "./transport";
import { UPLOAD_SLOTS, type RejectReason, type UploadAttempt, type UploadEvent, type UploadSlot, type UploadState } from "./types";

export type PickedFile = Blob & { name: string };

export interface SlotView {
  state: UploadState;
  /** A message about the last pick that did not change the slot (for example "that is a different file"). */
  notice?: RejectReason;
}

export interface ControllerDeps {
  getTransport(): UploadTransport;
  storage?: KeyValueStore | null;
  newId?: () => string;
  /** Milliseconds between status reads while checking. 0 turns automatic reads off (tests call refresh). */
  pollMs?: number;
  maxPolls?: number;
}

interface Entry {
  view: SlotView;
  file: PickedFile | null;
  token: number;
  abort: AbortController | null;
  hydrated: boolean;
  polls: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const sameFile = (a: UploadAttempt, f: PickedFile, contentType: string) => a.fileName === f.name.normalize("NFC").trim() && a.size === f.size && a.contentType === contentType;

export function createUploadController(deps: ControllerDeps) {
  const storage = deps.storage === undefined ? browserSessionStore() : deps.storage;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const pollMs = deps.pollMs ?? 4000;
  const maxPolls = deps.maxPolls ?? 15;
  const listeners = new Set<() => void>();
  const entries = Object.fromEntries(UPLOAD_SLOTS.map((s) => [s, { view: { state: IDLE }, file: null, token: 0, abort: null, hydrated: false, polls: 0, timer: null } satisfies Entry])) as Record<UploadSlot, Entry>;

  const emit = () => listeners.forEach((l) => l());

  function setView(slot: UploadSlot, state: UploadState, notice?: RejectReason) {
    entries[slot].view = notice ? { state, notice } : { state };
    emit();
  }

  function remember(slot: UploadSlot, state: UploadState) {
    const stage = persistStage(state);
    const attempt = attemptOf(state);
    if (stage && attempt) return savePersisted(storage, { attempt, stage });
    if (state.kind === "rejected" && state.previous) return savePersisted(storage, { attempt: state.previous.attempt, stage: persistStage(state.previous)! });
    if (state.kind === "idle" || state.kind === "rejected" || state.kind === "expired") clearPersisted(storage, slot);
  }

  function dispatch(slot: UploadSlot, event: UploadEvent) {
    const e = entries[slot];
    const next = transition(e.view.state, event);
    if (next === e.view.state && !e.view.notice) return;
    remember(slot, next);
    if (next.kind === "idle" || next.kind === "rejected" || next.kind === "expired") e.file = next.kind === "rejected" && next.previous ? e.file : null;
    setView(slot, next);
    if (next.kind === "checking" || next.kind === "in-review") schedulePoll(slot);
  }

  /* ------------------------------ driving ------------------------------ */

  async function drive(slot: UploadSlot, attempt: UploadAttempt, file: PickedFile, token: number) {
    const e = entries[slot];
    const t = deps.getTransport();
    const live = () => e.token === token;

    let req;
    try {
      req = await t.request({ requestId: attempt.requestId, purpose: slot, fileName: attempt.fileName, size: attempt.size, contentType: attempt.contentType });
    } catch {
      if (live()) dispatch(slot, { type: "lost-reply", stage: "request" });
      return;
    }
    if (!live()) return;
    if (!req.ok) return dispatch(slot, { type: "failure", stage: "request", failure: req });
    dispatch(slot, { type: "request-ok", uploadId: req.uploadId });

    let last = 0;
    const put = await t.putBytes(
      req.uploadUrl, // local only: never stored, logged or put in state
      file,
      (f) => {
        if (!live() || (f - last < 0.01 && f < 1)) return;
        last = f;
        dispatch(slot, { type: "progress", fraction: f });
      },
      e.abort?.signal,
    );
    if (!live()) return;
    if (!put.ok) {
      if (put.cause !== "aborted") dispatch(slot, { type: "put-failed", cause: put.cause });
      return;
    }
    dispatch(slot, { type: "bytes-sent" });
    await driveComplete(slot, token);
  }

  async function driveComplete(slot: UploadSlot, token: number) {
    const e = entries[slot];
    const attempt = attemptOf(e.view.state);
    if (!attempt?.uploadId) return;
    const live = () => e.token === token;
    try {
      const res = await deps.getTransport().complete({ requestId: attempt.requestId, uploadId: attempt.uploadId });
      if (!live()) return;
      if (res.ok) dispatch(slot, { type: "complete-ok" });
      else dispatch(slot, { type: "failure", stage: "complete", failure: res });
    } catch {
      if (live()) dispatch(slot, { type: "lost-reply", stage: "complete" });
    }
  }

  /* ------------------------------ polling ------------------------------ */

  function schedulePoll(slot: UploadSlot) {
    const e = entries[slot];
    if (e.timer) clearTimeout(e.timer);
    e.timer = null;
    if (pollMs <= 0 || e.polls >= maxPolls || !deps.getTransport().status) return;
    e.timer = setTimeout(() => void refresh(slot), pollMs);
  }

  async function refresh(slot: UploadSlot) {
    const e = entries[slot];
    const state = e.view.state;
    const attempt = attemptOf(state);
    const status = deps.getTransport().status;
    if ((state.kind !== "checking" && state.kind !== "in-review") || !attempt?.uploadId || !status) return;
    e.polls += 1;
    const token = e.token;
    try {
      const res = await status.call(deps.getTransport(), { uploadId: attempt.uploadId });
      if (e.token !== token) return;
      if (res.ok) dispatch(slot, { type: "status", status: res.status });
    } catch {
      /* a failed read changes nothing; the file stays "checking" */
    }
    if (e.view.state.kind === "checking") schedulePoll(slot);
  }

  /* ------------------------------ commands ------------------------------ */

  async function start(slot: UploadSlot, file: PickedFile, resume: UploadAttempt | null) {
    const e = entries[slot];
    const meta = checkFileMeta(slot, file);
    if (!meta.ok) {
      // While an uncertain attempt is waiting, a bad pick must not wipe its ids: show a notice only.
      if (resume) return setView(slot, e.view.state, meta.reason);
      return dispatch(slot, { type: "validate-failed", reason: meta.reason, fileName: file.name });
    }
    if (resume && !sameFile(resume, file, meta.contentType)) return setView(slot, e.view.state, "different-file");

    const token = ++e.token;
    if (!resume) dispatch(slot, { type: "validate-start", fileName: meta.fileName, size: file.size });
    try {
      const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      if (e.token !== token) return;
      if (!signatureMatches(extensionOf(meta.fileName), head)) {
        if (resume) return setView(slot, e.view.state, "signature");
        return dispatch(slot, { type: "validate-failed", reason: "signature", fileName: meta.fileName });
      }
    } catch {
      if (!resume) return dispatch(slot, { type: "validate-failed", reason: "empty", fileName: meta.fileName });
      return setView(slot, e.view.state, "empty");
    }

    const attempt: UploadAttempt = resume ?? { slot, requestId: newId(), fileName: meta.fileName, size: file.size, contentType: meta.contentType };
    e.file = file;
    e.abort = new AbortController();
    e.polls = 0;
    dispatch(slot, { type: "request-start", attempt });
    await drive(slot, attempt, file, token);
  }

  function unresolved(state: UploadState): boolean {
    return state.kind === "interrupted" || state.kind === "unknown-outcome" || (state.kind === "unavailable" && !!state.attempt);
  }

  const api = {
    getView: (slot: UploadSlot): SlotView => entries[slot].view,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    hasFile: (slot: UploadSlot) => entries[slot].file !== null,

    /** Reads what an earlier page load left (ids only). Safe to call repeatedly. */
    hydrate(slot: UploadSlot) {
      const e = entries[slot];
      if (e.hydrated) return;
      e.hydrated = true;
      const p = loadPersisted(storage, slot);
      if (p && e.view.state.kind === "idle") dispatch(slot, { type: "hydrate", attempt: p.attempt, stage: p.stage });
    },

    /** The person chose a file. An uncertain earlier attempt is resumed with ITS ids, never replaced silently. */
    async pick(slot: UploadSlot, file: PickedFile) {
      const e = entries[slot];
      e.hydrated = true;
      const state = e.view.state;
      if (isBusy(state)) return;
      if (state.kind === "unknown-outcome" && state.stage === "complete") return void (await api.retry(slot));
      if (unresolved(state)) return void (await api.retry(slot, file));
      await start(slot, file, null);
    },

    /** Try the uncertain step again with the ORIGINAL ids. Needs the file again after a refresh. */
    async retry(slot: UploadSlot, file?: PickedFile) {
      const e = entries[slot];
      const state = e.view.state;
      if (!unresolved(state)) return;
      const attempt = attemptOf(state)!;
      const stage = state.kind === "unknown-outcome" || state.kind === "unavailable" ? state.stage : "bytes";
      if (stage === "complete" && attempt.uploadId) {
        const token = ++e.token;
        dispatch(slot, { type: "complete-retry" });
        return driveComplete(slot, token);
      }
      const f = file ?? e.file;
      if (!f) return; // the UI asks the person to choose the same file
      await start(slot, f, attempt);
    },

    /** Cancel while preparing or sending. Nothing was handed over for checking. */
    cancel(slot: UploadSlot) {
      const e = entries[slot];
      const s = e.view.state;
      if (s.kind !== "requesting" && s.kind !== "uploading" && s.kind !== "validating") return;
      e.token += 1;
      e.abort?.abort();
      e.file = null;
      clearPersisted(storage, slot);
      setView(slot, s.kind === "validating" && s.previous ? s.previous : IDLE);
    },

    /** Explicit "start again": forget the old attempt. The next pick gets a NEW request id. */
    startOver(slot: UploadSlot) {
      const e = entries[slot];
      e.token += 1;
      e.abort?.abort();
      e.file = null;
      clearPersisted(storage, slot);
      setView(slot, IDLE);
    },

    /** Close a refusal message (a refused replacement falls back to the file already sent). */
    dismiss(slot: UploadSlot) {
      const e = entries[slot];
      if (e.view.notice) return setView(slot, e.view.state);
      dispatch(slot, { type: "reset" });
    },

    refresh,
  };
  return api;
}

export type UploadController = ReturnType<typeof createUploadController>;
