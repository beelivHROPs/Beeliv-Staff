"use client";

import { Calendar, MapPin } from "@/components/applicant/icons";
import { markFor, type GlyphName } from "@/components/shared/icons";

/** Icon direction B: the hospitality mark for each department chip (solid, 20px, same chip size). */
const DEPT_MARK: Record<string, GlyphName> = {
  "Front of house": "service-bell",
  Kitchen: "chef-hat",
  Bar: "cocktail",
  Management: "clipboard",
  Housekeeping: "bed",
  "Admin & operations": "till",
  Support: "key",
};
function DeptMark({ name }: { name: GlyphName }) {
  const M = markFor(name);
  return M ? <M className="size-5 shrink-0" style={{ ["--cut" as string]: "#f3f1f6" }} /> : null;
}
import { SelectMenu } from "../SelectMenu";
import { DATE_POSTED_OPTIONS, LOCATIONS, OPTION_GROUPS, type JobFilters, type ListKey } from "./filters";

/** Wireframe .sch: 52px bordered field with a leading muted icon. */
export const SCH =
  "flex h-[52px] items-center gap-2.5 rounded-[14px] border border-(--ap-line) bg-white px-3.5 text-(--ap-muted) focus-within:border-(--ap-violet) focus-within:shadow-[0_0_0_3px_rgba(138,10,163,.14)]";

export function LocationSelect({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`${SCH} ${className}`}>
      <SelectMenu
        id={id}
        label="Location"
        variant="bare"
        icon={<MapPin className="size-5 shrink-0 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" />}
        value={value}
        onChange={onChange}
        options={[{ value: "", label: "All locations" }, ...LOCATIONS]}
        menuClassName="-left-3.5! top-[calc(100%+14px)]!"
      />
    </div>
  );
}

/**
 * Wireframe filterBody(): Location select + option groups (Department /
 * Employment type / Experience level / Salary range / Shift pattern), plus a
 * Date posted select (requirements §2.14) using the dashboard's own SelectMenu.
 */
export function FilterBody({
  filters,
  idPrefix,
  onLocation,
  onPosted,
  onToggle,
}: {
  filters: JobFilters;
  idPrefix: string;
  onLocation: (v: string) => void;
  onPosted: (v: string) => void;
  onToggle: (key: ListKey, value: string) => void;
}) {
  const fg = "flex flex-col gap-3 border-b border-(--ap-line) py-[18px] last:border-b-0 last:pb-0";
  const h3 = "m-0 text-[15px] font-bold";
  return (
    <>
      <div className={fg}>
        <h3 className={h3}>Location</h3>
        <LocationSelect id={`${idPrefix}-loc`} value={filters.loc} onChange={onLocation} />
      </div>
      <div className={fg}>
        <h3 className={h3} id={`${idPrefix}-posted-h`}>
          Date posted
        </h3>
        <div className={SCH}>
          <SelectMenu
            id={`${idPrefix}-posted`}
            label="Date posted"
            variant="bare"
            icon={<Calendar className="size-5 shrink-0 text-(--ap-muted)" strokeWidth={1.6} aria-hidden="true" />}
            value={filters.posted}
            onChange={onPosted}
            options={DATE_POSTED_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            menuClassName="-left-3.5! top-[calc(100%+14px)]!"
          />
        </div>
      </div>
      {OPTION_GROUPS.map((g) => (
        <div key={g.key} className={fg} role="group" aria-label={g.title}>
          <h3 className={h3}>{g.title}</h3>
          <div className="flex flex-wrap gap-2">
            {g.options.map(({ value, icon: Icon }) => {
              const on = filters[g.key].includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(g.key, value)}
                  className={`relative inline-flex min-h-[46px] cursor-pointer items-center gap-[9px] rounded-[13px] border-[1.5px] px-[13px] py-2 text-left text-sm font-semibold transition-colors ${
                    on
                      ? "border-(--ap-violet) bg-[rgba(91,8,123,.05)] text-(--ap-violet)"
                      : "border-transparent bg-[#F3F1F6] text-(--ap-ink) hover:bg-[#ECE8F1]"
                  }`}
                >
                  {g.key === "dept" && DEPT_MARK[value] ? (
                    <DeptMark name={DEPT_MARK[value]} />
                  ) : Icon ? (
                    <Icon className="size-[19px] shrink-0" strokeWidth={1.6} fill="currentColor" fillOpacity={0.14} aria-hidden="true" />
                  ) : null}
                  {value}
                  {on ? (
                    <span aria-hidden="true" className="absolute top-0.5 right-1.5 text-[13px] leading-normal font-bold text-(--ap-violet)">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
