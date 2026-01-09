/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../config';

const findMyMoloniIds = async () => {
  const credentials = {
    // grant_type is required to specify the authentication method
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
    console.log(companies.data);
    // Get the first available company ID
    const companyId = companies.data[1].company_id;
    console.log(`Your Company ID: ${companyId}\n`);

    const docSets = await axios.post(
      `https://api.moloni.pt/v1/documentSets/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId.toString() }) // Using URLSearchParams for correct form-data format
    );

    docSets.data.forEach((set: any) => {
      console.log(`ID: ${set.document_set_id} | Name: ${set.name}`);
    });

    const taxes = await axios.post(
      `https://api.moloni.pt/v1/taxes/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId.toString() })
    );

    console.log('Your Account Tax List:');
    taxes.data.forEach((t: any) => {
      console.log(`ID: ${t.tax_id} | Value: ${t.value}% | Name: ${t.name}`);
    });

    console.log(
      '\n--- Process Completed! Copy the required IDs to your .env file ---'
    );
  } catch (error: any) {
    console.error('Error Details:', error.response?.data || error.message);
  }
};

findMyMoloniIds();
