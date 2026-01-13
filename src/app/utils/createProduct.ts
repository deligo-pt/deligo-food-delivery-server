/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../config';
import qs from 'qs';

const setupProductInMoloni = async () => {
  const credentials = {
    grant_type: 'password',
    client_id: config.moloni.client_id,
    client_secret: config.moloni.client_secret,
    username: config.moloni.username,
    password: config.moloni.password,
  };

  try {
    const auth = await axios.get('https://api.moloni.pt/v1/grant/', {
      params: credentials,
    });
    const token = auth.data.access_token;
    const companyId = config.moloni.company_id;

    const categoryResponse = await axios.post(
      `https://api.moloni.pt/v1/productCategories/insert/?access_token=${token}`,
      qs.stringify({
        company_id: companyId,
        parent_id: 0,
        name: 'General Food',
        description: 'All food and addon items',
        pos_enabled: 1,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const categoryId = categoryResponse.data.category_id;
    console.log(`Category Ready! ID: ${categoryId}`);

    const productData = {
      company_id: companyId,
      category_id: categoryId,
      type: 1,
      name: 'Master Product Item',
      reference: 'GENERIC-001',
      price: 0,
      unit_id: 0,
      has_stock: 0,
      taxes: [
        {
          tax_id: 3741600,
          value: 13,
          order: 1,
          cumulative: 0,
        },
      ],
    };

    const productResponse = await axios.post(
      `https://api.moloni.pt/v1/products/insert/?access_token=${token}`,
      qs.stringify(productData, { arrayFormat: 'indices' }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (productResponse.data && productResponse.data.product_id) {
      console.log('Master Product Created Successfully!');
      console.log('-----------------------------------');
      console.log('SAVE THIS PRODUCT ID:', productResponse.data.product_id);
      console.log('-----------------------------------');
    }
  } catch (error: any) {
    console.error(
      'Moloni API Response:',
      JSON.stringify(error.response?.data || error.message, null, 2)
    );
  }
};

setupProductInMoloni();
