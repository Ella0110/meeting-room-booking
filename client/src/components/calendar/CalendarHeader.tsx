import {
    addDays,
    formatDisplayDate,
    isSameDay,
    getWeekDates,
} from "../../utils/dateUtils";

interface CalendarHeaderProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: "day" | "week";
    onViewModeChange: (mode: "day" | "week") => void;
}

const MAX_DAYS_AHEAD = 7;

function formatWeekRange(start: Date, end: Date): string {
    if (start.getMonth() === end.getMonth()) {
        return `${start.getMonth() + 1}月${start.getDate()}日 — ${end.getDate()}日`;
    }
    return `${start.getMonth() + 1}月${start.getDate()}日 — ${end.getMonth() + 1}月${end.getDate()}日`;
}

export default function CalendarHeader({
    selectedDate,
    onDateChange,
    viewMode,
    onViewModeChange,
}: CalendarHeaderProps) {
    const today = new Date();
    const maxDate = addDays(today, MAX_DAYS_AHEAD);
    const weekDates = getWeekDates(selectedDate);

    // Day mode bounds
    const isToday = isSameDay(selectedDate, today);
    const isAtMax = selectedDate >= maxDate;

    // Week mode bounds
    const monday = weekDates[0];
    const todayMonday = getWeekDates(today)[0];
    const isCurrentWeek = isSameDay(monday, todayMonday);
    const isAtMaxWeek = addDays(monday, 7) > maxDate;

    const prevDisabled = viewMode === "week" ? isCurrentWeek : isToday;
    const nextDisabled = viewMode === "week" ? isAtMaxWeek : isAtMax;
    const isAtStart = viewMode === "week" ? isCurrentWeek : isToday;

    return (
        <div
            className="border-b-4 border-black"
            style={{ background: "#FFBE0B" }}
        >
            <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <div className="flex items-center gap-3">
                        {/* Prev */}
                        <button
                            onClick={() =>
                                onDateChange(
                                    addDays(
                                        selectedDate,
                                        viewMode === "week" ? -7 : -1,
                                    ),
                                )
                            }
                            disabled={prevDisabled}
                            className="rounded-none border-4 border-black bg-white px-3 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-30 disabled:pointer-events-none"
                            aria-label={
                                viewMode === "week" ? "上一周" : "上一天"
                            }
                        >
                            ←
                        </button>

                        {/* Date / week range */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                                className="font-grotesk font-black text-[15px] uppercase truncate"
                                style={{ letterSpacing: "0.3px" }}
                            >
                                {viewMode === "week"
                                    ? formatWeekRange(
                                          weekDates[0],
                                          weekDates[6],
                                      )
                                    : formatDisplayDate(selectedDate)}
                            </span>
                            {viewMode === "day" && isToday && (
                                <span
                                    className="hidden sm:inline-block font-grotesk font-black text-[9px] uppercase px-1.5 py-0.5 flex-shrink-0"
                                    style={{
                                        background: "#000",
                                        color: "#FFBE0B",
                                        border: "2px solid #000",
                                        transform: "rotate(1deg)",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    TODAY
                                </span>
                            )}
                            {viewMode === "week" && isCurrentWeek && (
                                <span
                                    className="hidden sm:inline-block font-grotesk font-black text-[9px] uppercase px-1.5 py-0.5 flex-shrink-0"
                                    style={{
                                        background: "#000",
                                        color: "#FFBE0B",
                                        border: "2px solid #000",
                                        transform: "rotate(1deg)",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    本周
                                </span>
                            )}
                        </div>

                        {/* Next */}
                        <button
                            onClick={() =>
                                onDateChange(
                                    addDays(
                                        selectedDate,
                                        viewMode === "week" ? 7 : 1,
                                    ),
                                )
                            }
                            disabled={nextDisabled}
                            className="rounded-none border-4 border-black bg-white px-3 py-1 font-grotesk font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-30 disabled:pointer-events-none"
                            aria-label={
                                viewMode === "week" ? "下一周" : "下一天"
                            }
                        >
                            →
                        </button>

                        {/* Today button */}
                        {!isAtStart && (
                            <button
                                onClick={() => onDateChange(today)}
                                className="hidden md:flex rounded-none border-4 border-black bg-black text-white px-3 py-1 font-grotesk font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                            >
                                ★ 今天
                            </button>
                        )}
                    </div>
                    {/* Day / Week toggle (desktop only) */}
                    <div className="hidden md:flex border-4 border-black overflow-hidden flex-shrink-0">
                        {(["day", "week"] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => onViewModeChange(mode)}
                                className="px-3 py-1 font-grotesk font-black text-xs uppercase transition-all active:scale-95"
                                style={{
                                    background:
                                        viewMode === mode ? "#000" : "#fff",
                                    color:
                                        viewMode === mode ? "#FFBE0B" : "#000",
                                    borderRight:
                                        mode === "day"
                                            ? "2px solid #000"
                                            : "none",
                                }}
                            >
                                {mode === "day" ? "日" : "周"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
