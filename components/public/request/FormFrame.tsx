"use client";

import type { FormEventHandler, KeyboardEventHandler, ReactNode, Ref } from "react";

/**
 * The form column's container. Desktop (>= 820px): the wireframe's white card
 * (18px radius, 1px hairline, 40px padding, soft shadow). Mobile: no card, the
 * form sits directly on the page background. `as="div"` is the loading skeleton.
 */
export function FormFrame({
  as = "form",
  formRef,
  onSubmit,
  onKeyDown,
  ariaBusy,
  children,
}: {
  as?: "form" | "div";
  formRef?: Ref<HTMLFormElement>;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onKeyDown?: KeyboardEventHandler<HTMLFormElement>;
  ariaBusy?: boolean;
  children: ReactNode;
}) {
  const cls =
    "flex flex-col gap-4 wf-d:gap-6 wf-d:rounded-[18px] wf-d:border wf-d:border-(--soft-border) wf-d:bg-white wf-d:p-[calc(40*var(--u))] wf-d:shadow-[0_14px_40px_rgba(17,17,27,.06)]";
  if (as === "div") return <div className={cls}>{children}</div>;
  return (
    <form
      ref={formRef}
      // POST, so a submit before the page has hydrated can never put answers in the URL.
      method="post"
      noValidate
      aria-busy={ariaBusy}
      aria-label="Request talent"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={cls}
    >
      {children}
    </form>
  );
}
