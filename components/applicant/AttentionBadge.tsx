/** Bold red "!" for anything that needs the person to act. Heavy glyph, same size, so it is hard to miss. */
export function AttentionBadge({ className = "size-7", halo = true }: { className?: string; halo?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-white ${halo ? "shadow-[0_0_0_4px_rgba(200,16,46,.16)]" : ""} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <path d="M12 4.5v9" />
        <path d="M12 19.5v.01" />
      </svg>
    </span>
  );
}
