/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../config';

const findMyMoloniIds = async () => {
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

    const companies = await axios.post(
      `https://api.moloni.pt/v1/companies/getAll/?access_token=${token}`
    );

    const companyId = companies.data[1].company_id;
    console.log(`Using Company ID: ${companyId}\n`);

    console.log('\n-------------All customers---------------------');
    const customers = await axios.post(
      `https://api.moloni.pt/v1/customers/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId.toString() })
    );

    const checkSets = await axios.post(
      `https://api.moloni.pt/v1/documentSets/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId.toString() })
    );

    const set75 = checkSets.data.find((s: any) => s.document_set_id === 907075);
    const set88 = checkSets.data.find((s: any) => s.document_set_id === 907888);

    console.log('Set 907075 Info:', set75);
    console.log('Set 907888 Info:', set88);

    if (Array.isArray(customers.data) && customers.data.length > 0) {
      customers.data.forEach((c: any) => {
        console.log(
          `Customer ID: ${c.customer_id} | Name: ${c.name} | Email: ${
            c.email || 'N/A'
          }`
        );
      });
    } else {
      console.log('No customers found in your account.');
    }

    console.log('\n----------All document sets-----------');
    const docSets = await axios.post(
      `https://api.moloni.pt/v1/documentSets/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId.toString() })
    );
    docSets.data.forEach((set: any) => {
      console.log(`ID: ${set.document_set_id} | Name: ${set.name}`);
    });

    console.log('\n--- Tax Rates (IVA) ---');
    const taxes = await axios.post(
      `https://api.moloni.pt/v1/taxes/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId.toString() })
    );
    taxes.data.forEach((t: any) => {
      console.log(`ID: ${t.tax_id} | Value: ${t.value}% | Name: ${t.name}`);
    });

    console.log('\n------All units---------');
    try {
      const units = await axios.post(
        `https://api.moloni.pt/v1/measurementUnits/getAll/?access_token=${token}`,
        new URLSearchParams({ company_id: companyId.toString() })
      );
      units.data.forEach((u: any) => {
        console.log(`ID: ${u.unit_id} | Name: ${u.name}`);
      });
    } catch (e) {
      console.log(
        'Could not fetch units. Check if endpoint "unit/getAll" is correct for your version.'
      );
    }

    console.log('\n--- Product Categories ---');
    const categories = await axios.post(
      `https://api.moloni.pt/v1/productCategories/getAll/?access_token=${token}`,
      new URLSearchParams({
        company_id: companyId.toString(),
        parent_id: '0',
      })
    );

    categories.data.forEach((cat: any) => {
      console.log(`ID: ${cat.category_id} | Name: ${cat.name}`);
    });
  } catch (error: any) {
    console.error('Error Details:', error.response?.data || error.message);
  }
};

findMyMoloniIds();
