export const calculateDistance = (
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
) => {
  if (
    lng1 === undefined ||
    lat1 === undefined ||
    lng2 === undefined ||
    lat2 === undefined
  ) {
    return { km: 0, meters: 0 };
  }

  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371; // Earth radius in KM
  const dLng = toRad(lng2 - lng1);
  const dLat = toRad(lat2 - lat1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceKm = R * c;
  const distanceMeters = distanceKm * 1000;

  return {
    km: parseFloat(distanceKm.toFixed(6)),
    meters: Math.round(distanceMeters), // meters should be integer
  };
};
