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

export const localizeProductData = (
  product: any,
  role: string,
  lang: 'en' | 'pt',
) => {
  if (!product) return null;

  const productObj =
    typeof product.toObject === 'function'
      ? product.toObject({ virtuals: true })
      : product;

  if (
    role === 'VENDOR' ||
    role === 'SUB_VENDOR' ||
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN'
  ) {
    return productObj;
  }

  return {
    ...productObj,
    name: productObj.name?.[lang] || productObj.name?.en || '',
    description:
      productObj.description?.[lang] || productObj.description?.en || '',

    category:
      productObj.category && typeof productObj.category === 'object'
        ? {
            ...productObj.category,
            name:
              productObj.category.name?.[lang] ||
              productObj.category.name?.en ||
              '',
          }
        : productObj.category,

    variations: productObj.variations?.map((v: any) => ({
      ...v,
      name: v.name?.[lang] || v.name?.en || '',
      options: v.options?.map((o: any) => ({
        ...o,
        label: o.label?.[lang] || o.label?.en || '',
      })),
    })),
  };
};
