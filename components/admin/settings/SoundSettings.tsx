"use client";

/**
 * Interface sound settings, shared by Admin Settings and Client Settings (Appearance section):
 * master switch, volume, per-category switches, quiet hours and the ringtone choice with Preview.
 * Everything is saved on this device only (lib/admin/sound.ts). Uses the same row look as the
 * surrounding settings sections; no new containers.
 */
import type { ReactNode } from "react";
import {
  playAdminSound,
  previewRingtone,
  RINGTONE_OPTIONS,
  setSoundPrefs,
  SOUND_CATEGORIES,
  useSoundPrefs,
  type RingtoneChoice,
} from "@/lib/admin/sound";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)";

function Row({ title, detail, children }: { title: string; detail?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-(--ap-line-2) py-3.5 first:border-t-0 max-[767px]:items-start">
      <div className="min-w-0">
        <b className="block text-base">{title}</b>
        {detail ? <span className="ap-sm block wrap-anywhere">{detail}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`ap-switch shrink-0 ${FOCUS}`} />;
}

const TIME = "ap-input h-10 w-auto min-w-0 px-2.5 text-[15px]";

export function SoundSettingsRows() {
  const sound = useSoundPrefs();
  return (
    <>
      <Row title="Interface sounds" detail="Soft hospitality sounds for new notifications, client requests, confirmations and errors. Every sound also has a visible message. Saved on this device.">
        <Switch
          on={sound.on}
          label="Interface sounds"
          onClick={() => {
            setSoundPrefs({ on: !sound.on });
            if (!sound.on) window.setTimeout(() => playAdminSound("saved", { preview: true }), 60);
          }}
        />
      </Row>
      {sound.on ? (
        <>
          <Row title="Sound volume" detail="Plays a sample when you change it.">
            <div className="flex gap-1.5" role="group" aria-label="Sound volume">
              {([["Low", 0.25], ["Medium", 0.5], ["High", 0.85]] as const).map(([label, v]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={sound.volume === v}
                  onClick={() => {
                    setSoundPrefs({ volume: v });
                    window.setTimeout(() => playAdminSound("notify", { preview: true }), 60);
                  }}
                  className="ap-pick"
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          {SOUND_CATEGORIES.map((c) => (
            <Row key={c.key} title={c.label} detail={c.detail}>
              <Switch on={sound.categories[c.key]} label={c.label} onClick={() => setSoundPrefs({ categories: { [c.key]: !sound.categories[c.key] } })} />
            </Row>
          ))}
          <Row title="Ringtone for new client requests" detail="Rings up to 3 times until you open Client requests or press Escape.">
            <div className="flex flex-wrap justify-end gap-1.5">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ringtone">
                {RINGTONE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={sound.ringtone === o.value}
                    onClick={() => {
                      setSoundPrefs({ ringtone: o.value as RingtoneChoice });
                      previewRingtone(o.value);
                    }}
                    className="ap-pick"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => previewRingtone(sound.ringtone)} className={`ap-btn ap-btn-s ap-btn-sm ${FOCUS}`}>
                Preview
              </button>
            </div>
          </Row>
          <Row title="Quiet hours" detail="No sounds between these times. Messages still appear on screen.">
            <Switch on={sound.quiet.on} label="Quiet hours" onClick={() => setSoundPrefs({ quiet: { on: !sound.quiet.on } })} />
          </Row>
          {sound.quiet.on ? (
            <Row title="Quiet from and to">
              <div className="flex items-center gap-2">
                <input type="time" aria-label="Quiet hours start" value={sound.quiet.from} onChange={(e) => e.target.value && setSoundPrefs({ quiet: { from: e.target.value } })} className={TIME} />
                <span className="ap-sm">to</span>
                <input type="time" aria-label="Quiet hours end" value={sound.quiet.to} onChange={(e) => e.target.value && setSoundPrefs({ quiet: { to: e.target.value } })} className={TIME} />
              </div>
            </Row>
          ) : null}
        </>
      ) : null}
    </>
  );
}
