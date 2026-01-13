/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../config';

const getCorrectSetId = async () => {
  try {
    const auth = await axios.get('https://api.moloni.pt/v1/grant/', {
      params: {
        grant_type: 'password',
        client_id: config.moloni.client_id,
        client_secret: config.moloni.client_secret,
        username: config.moloni.username,
        password: config.moloni.password,
      },
    });

    const token = auth.data.access_token;
    const companyId = config?.moloni?.company_id!.toString();

    console.log(`Checking for Company ID: ${companyId}...`);

    const response = await axios.post(
      `https://api.moloni.pt/v1/documentSets/getAll/?access_token=${token}`,
      new URLSearchParams({ company_id: companyId }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('\n--- Our Document Sets ---');
      response.data.forEach((set: any) => {
        console.log(
          `ID: ${set.document_set_id} | Name: ${set.name} | Active: ${
            set.active_by_default ? 'YES' : 'NO'
          }`
        );
      });
      console.log('\n Set ');
    } else {
      console.log('Not found document set', response.data);
    }
  } catch (error: any) {
    console.error('Error Details:', error.response?.data || error.message);
  }
};

getCorrectSetId();
