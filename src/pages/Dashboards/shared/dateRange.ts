/** Format a Date as yyyy-MM-dd for date inputs and API fromDate/toDate params. */
export const toInputDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Default filter range: first day of current month → today. */
export const getDefaultMonthToTodayRange = (): {
  fromDate: string;
  toDate: string;
} => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    fromDate: toInputDate(firstOfMonth),
    toDate: toInputDate(now),
  };
};
