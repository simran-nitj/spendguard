export const parseMonthString = (monthStr: string): { startOfMonth: Date; endOfMonth: Date } => {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10) - 1; // 0-indexed in JS Date

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    throw new Error('Invalid month format. Expected YYYY-MM.');
  }

  const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return { startOfMonth, endOfMonth };
};

export const formatYearMonth = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getPreviousMonthString = (monthStr: string): string => {
  const [yearStr, monthNumStr] = monthStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthNumStr, 10) - 1;

  if (month === 0) {
    year -= 1;
    month = 12;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
};

export const getPastMonthsRange = (monthsCount: number): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
  const startDate = new Date(Date.UTC(currentYear, currentMonth - (monthsCount - 1), 1, 0, 0, 0, 0));

  return { startDate, endDate };
};
