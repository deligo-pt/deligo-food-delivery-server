/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { TProduct } from '../Product/product.interface';
import { getPdAccessToken } from './getPdAccessToken';
import config from '../../config';
import { Product } from '../Product/product.model';

// Sync a product to Pasta Digital
const syncProductToPd = async (product: TProduct) => {
  const pdToken = await getPdAccessToken();
  const PD_API_URL = `${config.pastaDigital.api_url}/products`;

  const sendRequest = async (
    id: string,
    name: string,
    originalPrice: number,
    isVariation: boolean = false,
    sku: string = '',
  ) => {
    const pdTaxId = product.pricing.taxRate === 13 ? 2 : 1;

    const payload = {
      reference: id,
      description: name.substring(0, 100),
      short_description: product.category
        ? product.category.toString().substring(0, 50)
        : 'General Food',
      type: 0,
      family_id: 1,
      tax_id: pdTaxId,
      barcode: `${id}-BC`,
      barcode_type: 0,
      unit_of_sale_id: 'UNI',
      category: 0,
      enabled: true,
      ecommerce: true,
      pos_text_color: '#092c4c',
      supplier_id: 0,
      exemption_code: null,
      prices: [
        {
          price: originalPrice,
          price_line_id: 2,
          fixed_margin: 0,
          tax_price: 0,
        },
      ],
    };

    try {
      const { data } = await axios.post(PD_API_URL, payload, {
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pdToken}`,
        },
      });

      if (isVariation) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { 'variations.$[].options.$[opt].pdItemId': id } },
          {
            arrayFilters: [{ 'opt.sku': sku }],
          },
        );
      } else {
        await Product.findByIdAndUpdate(product._id, { pdItemId: id });
      }

      return data;
    } catch (error: any) {
      console.error(
        `Pasta Digital Failed [${id}]:`,
        error.response?.data || error.message,
      );
    }
  };

  if (
    product.stock.hasVariations &&
    product.variations &&
    product.variations.length > 0
  ) {
    for (const variation of product.variations) {
      if (variation.options) {
        for (const option of variation.options) {
          const variationName = `${product.name} (${option.label})`;
          await sendRequest(
            option.sku || `${product.productId}-${option.label.toUpperCase()}`,
            variationName,
            option.price,
            true,
            option.sku,
          );
        }
      }
    }
  } else {
    await sendRequest(product.productId, product.name, product.pricing.price);
  }
};

// Update a product in Pasta Digital
const updateProductInPd = async (reference: string, updateData: any) => {
  try {
    const token = await getPdAccessToken();
    const url = `${config.pastaDigital.api_url}/products/${reference}`;

    const response = await axios.patch(url, updateData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error(
      `Pasta Digital Product Update Error (${reference}):`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const ProductPdService = {
  syncProductToPd,
  updateProductInPd,
};
