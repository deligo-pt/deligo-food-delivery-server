export const getLocalStartOfPeriod = (
  type: 'today' | 'week' | 'month',
  timeZone: string = 'Europe/Lisbon',
): Date => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;

  const localToday = new Date(`${year}-${month}-${day}T00:00:00`);

  if (type === 'today') return localToday;

  if (type === 'week') {
    const dayOfWeek = localToday.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    localToday.setDate(localToday.getDate() - diffToMonday);
    return localToday;
  }

  if (type === 'month') {
    return new Date(`${year}-${month}-01T00:00:00`);
  }

  return localToday;
};
