export type TLiveLocationPayload = {
  latitude: number;
  longitude: number;
  geoAccuracy?: number;
  heading?: number;
  speed?: number;
  isMocked?: boolean;
  timestamp?: string;
};

export type TGeoJSONPoint = {
  type: 'Point';
  coordinates: [number, number];
  geoAccuracy?: number;
  heading?: number;
  speed?: number;
  isMocked?: boolean;
  lastLocationUpdate: Date;
};
