/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getPdAccessToken } from './getPdAccessToken';
import config from '../../config';
import { AddonGroup } from '../Add-Ons/addOns.model';

const syncAddonToPd = async (addonGroup: any) => {
  const pdToken = await getPdAccessToken();
  const PD_API_URL = `${config.pastaDigital.api_url}/products`;

  const sendRequest = async (option: any) => {
    const rate = option.tax?.taxRate;
    const pdTaxId = rate === 13 ? 2 : rate === 6 ? 3 : 1;

    const payload = {
      reference: option.sku,
      description: `${addonGroup.title} - ${option.name}`.substring(0, 100),
      short_description: 'Addon',
      type: 0,
      family_id: 4,
      tax_id: pdTaxId,
      barcode: `${option.sku}-BC`,
      barcode_type: 0,
      unit_of_sale_id: 'UNI',
      enabled: true,
      prices: [
        {
          price: option.price,
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

      await AddonGroup.updateOne(
        { _id: addonGroup._id, 'options.sku': option.sku },
        { $set: { 'options.$.pdItemId': option.sku } },
      );

      return data;
    } catch (error: any) {
      console.error(
        `Pasta Digital Addon Failed [${option.sku}]:`,
        error.response?.data || error.message,
      );
    }
  };

  if (addonGroup.options && addonGroup.options.length > 0) {
    const syncPromises = addonGroup.options.map((option: any) =>
      sendRequest(option),
    );
    await Promise.all(syncPromises);
  }
};

export const AddonPdService = {
  syncAddonToPd,
};
