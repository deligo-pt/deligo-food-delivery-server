import { GlobalSettings } from './globalSetting.model';

const getPerMeterRate = async () => {
  const result = await GlobalSettings.find();
  return result[0].deliveryChargePerMeter;
};

export const GlobalSettingServices = {
  getPerMeterRate,
};
