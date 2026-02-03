export const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const cleanForSKU = (str: string): string =>
  str
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);
