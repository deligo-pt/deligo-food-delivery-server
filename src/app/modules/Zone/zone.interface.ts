export type TZoneBoundary = {
  type: 'Polygon';
  coordinates: [number, number][][];
};

export type TZone = {
  _id?: string;
  zoneId: string; // Unique identifier: e.g., 'Lisbon-Zone-02'
  district: string; // e.g., 'Lisbon'
  zoneName: string; // e.g., 'Lisbon Centre'

  // The digitized boundary of the zone
  boundary: TZoneBoundary;

  isOperational: boolean;
  minDeliveryFee: number;
  maxDeliveryDistanceKm: number;

  isDeleted?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
};
