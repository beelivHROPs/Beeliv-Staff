/** Client analytics primitives (brief section 24). Pages import from here and never style charts themselves. */
export { AnalyticsPanel, ChartHeader } from "./AnalyticsPanel";
export { ChartLegend, type LegendItem } from "./ChartLegend";
export { ChartTooltip, type TooltipRow } from "./ChartTooltip";
export { DonutChart, type DonutSegment } from "./DonutChart";
export { StackedBarChart, type StackedBarPoint, type StackSegment } from "./StackedBarChart";
export { TrendChart, type TrendPoint } from "./TrendChart";
export { HorizontalBarChart, type BarRow } from "./HorizontalBarChart";
export { CoverageBar } from "./CoverageBar";
export { DateRangeSelector, resolveRange, type RangeValue, type RangePreset, type PresetOption } from "./DateRangeSelector";
export { ChartSkeleton, ChartEmptyState, ChartErrorState, ChartRestrictedState } from "./ChartStates";
export { STATUS_COLOR, STATUS_LABEL, DEPARTMENT_COLOR } from "./colors";
export { AnalyticsFilterBar, type FilterField } from "./AnalyticsFilterBar";
export { MetricSummary, type MetricItem } from "./MetricSummary";
