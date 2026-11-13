"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, BriefcaseBusiness, LogOut } from "@/components/applicant/icons";
import { promoImage, useAvatarState } from "@/lib/applicant/avatar";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { useApplicantStore } from "@/lib/applicant/service";
import { ModeSwitcher, MoreSheet, useLogout } from "./AppShell";
import { MORE_ROUTES, NAV_ITEMS } from "./nav";

/**
 * Phones: the hamburger on the Profile page. It opens the menu that used to live behind the
 * bottom nav's "More" tab (Interviews, Documents, Settings, Help, Staff Hub, website, log out).
 * A small dot on the button shows when something needs attention (a document is due or an
 * interview is booked), since those pages are no longer one tap away in the bottom nav.
 */
/** The "More" menu (phones): opened from the bottom nav's More tab. */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const close = onClose;
  const store = useApplicantStore();
  const logout = useLogout();
  const { gender } = useAvatarState();
  const staffGranted = store.profile.staffEntitlement.granted;
  const items = NAV_ITEMS.filter((i) => MORE_ROUTES.includes(i.href));

  return (
    <>
      <MoreSheet open={open} onClose={close} title="More">
        <div className="relative mb-3.5 grid grid-cols-[minmax(0,1fr)_132px] items-end gap-1.5 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#8a0aa3_0%,#5b087b_55%,#250044_100%)] pt-4 pl-4 text-white">
          <div className="pb-4">
            <b className="ap-serif block text-xl leading-tight">Build your hospitality career with Beeliv</b>
            <p className="mt-1.5 text-[13px] leading-normal text-white/72">Explore opportunities, learn and grow with leading hospitality brands.</p>
          </div>
          <div className="relative h-[150px]" aria-hidden="true">
            <span className="absolute bottom-[-50px] left-1/2 size-[170px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_42%,rgba(201,164,92,.5),rgba(201,164,92,.15)_45%,transparent_70%)]" />
            <Image src={promoImage(gender)} alt="" width={200} height={230} className="absolute bottom-0 left-1/2 h-[160px] w-auto max-w-none -translate-x-1/2 drop-shadow-[0_12px_14px_rgba(0,0,0,.35)]" />
          </div>
        </div>
        <div className="flex flex-col">
          {staffGranted ? (
            <Link href="/applicant/staff-access" onClick={close} className="flex h-13 items-center gap-3 rounded-[9px] px-2 text-[16px] font-bold text-(--ap-violet)">
              <BriefcaseBusiness className="size-[19px]" aria-hidden="true" />
              Staff Hub
            </Link>
          ) : null}
          {items.map((item) => (
            <Link key={item.href} href={item.href} onClick={close} className="flex h-13 items-center gap-3 rounded-[9px] px-2 text-[16px] font-semibold text-(--ap-ink-2)">
              <item.icon className="size-[19px]" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
          <hr className="my-1.5 border-(--ap-line-2)" />
          <Link href="/" onClick={close} className="flex h-13 items-center gap-3 rounded-[9px] px-2 text-[16px] font-semibold text-(--ap-ink-2)">
            <ArrowUpLeft className="size-[19px]" aria-hidden="true" />
            Back to Beeliv website
          </Link>
          <button
            type="button"
            onClick={() => {
              close();
              logout();
            }}
            className="flex h-13 w-full items-center gap-3 rounded-[9px] px-2 text-left text-[16px] font-semibold text-(--ap-ink-2)"
          >
            <LogOut className="size-[19px]" aria-hidden="true" />
            Log out
          </button>
          {SHOW_PROTOTYPE_CONTROLS && (
            <div className="mt-1 border-t border-(--ap-line-2) pt-3">
              <ModeSwitcher mode={store.mode} compact />
            </div>
          )}
        </div>
      </MoreSheet>
    </>
  );
}
