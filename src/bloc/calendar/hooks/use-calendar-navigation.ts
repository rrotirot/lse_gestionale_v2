import { useCallback } from "react";

import { useCalendar } from "@/calendar/contexts/calendar-context";

export function useCalendarNavigation() {
  const { setSelectedDate } = useCalendar();

  const goToDay = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      // TODO: Replace with app navigation (removed next/navigation import)
      console.log("Navigating to day-view");
    },
    [setSelectedDate]
  );

  const goToMonth = useCallback(
    (monthDate: Date) => {
      setSelectedDate(monthDate);
      // TODO: Replace with app navigation (removed next/navigation import)
      console.log("Navigating to month-view");
    },
    [setSelectedDate]
  );

  return { goToDay, goToMonth };
}

