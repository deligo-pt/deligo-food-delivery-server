/* eslint-disable @typescript-eslint/no-explicit-any */

import { Vendor } from '../Vendor/vendor.model';

type MapGrowthParams = {
  growth: any[];
  timelineMap: Record<string, number>;
  start: Date;
  end: Date;
  resolution: 'day' | 'multiDay' | 'month' | 'multiMonth' | 'year';
  size: number;
};

const TZ = 'Europe/Lisbon';

// getReportTimeframe
export const getReportTimeframe = (
  timeframe?: string,
  fromDate?: string | Date,
  toDate?: string | Date,
) => {
  const now = new Date();
  const end: Date = toDate ? new Date(toDate) : now;
  let start: Date;

  if (!timeframe && !fromDate) {
    start = new Date();
    start.setDate(start.getDate() - (365 - 1));
  } else if (timeframe === 'custom' && fromDate) {
    start = new Date(fromDate);
  } else {
    let days = 7;
    if (timeframe === 'last14days') days = 14;
    else if (timeframe === 'last30days') days = 30;
    else if (timeframe === 'last90days') days = 90;
    else if (timeframe === 'last1year') days = 365;

    start = new Date();
    start.setDate(start.getDate() - (days - 1));
  }

  start.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    Math.abs(end.getTime() - start.getTime()) / (1000 * 3600 * 24),
  );

  let resolution: 'day' | 'multiDay' | 'month' | 'multiMonth' | 'year';
  let size = 1;

  if (diffDays <= 14) {
    resolution = 'day';
  } else if (diffDays <= 30) {
    resolution = 'multiDay';
    size = 3;
  } else if (diffDays <= 90) {
    resolution = 'multiDay';
    size = 9;
  } else if (diffDays <= 365) {
    resolution = 'month';
  } else if (diffDays <= 730) {
    resolution = 'multiMonth';
    size = 2;
  } else {
    resolution = 'year';
  }

  return { start, end, resolution, size };
};

// generateEmptyBuckets
export const generateEmptyBuckets = (
  start: Date,
  end: Date,
  resolution: string,
  size: number,
) => {
  const buckets: Record<string, number> = {};
  const current = new Date(start);

  while (current <= end) {
    let label = '';

    if (resolution === 'day') {
      label = current
        .toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          timeZone: TZ,
        })
        .replace(' ', '');
      current.setDate(current.getDate() + 1);
    } else if (resolution === 'multiDay') {
      const dStart = new Date(current);
      const dEnd = new Date(current);
      dEnd.setDate(dEnd.getDate() + size - 1);
      const finalEnd = dEnd > end ? end : dEnd;

      label = `${dStart.getDate()}${dStart.toLocaleString('en-US', { month: 'short', timeZone: TZ })}-${finalEnd.getDate()}${finalEnd.toLocaleString('en-US', { month: 'short', timeZone: TZ })}`;
      current.setDate(current.getDate() + size);
    } else if (resolution === 'month') {
      label = `${current.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${current
        .getFullYear()
        .toString()
        .slice(-2)}`;
      current.setMonth(current.getMonth() + 1);
    } else if (resolution === 'multiMonth') {
      const mStart = new Date(current);
      const mEnd = new Date(current);
      mEnd.setMonth(mEnd.getMonth() + size - 1);

      label = `${mStart.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${mStart
        .getFullYear()
        .toString()
        .slice(
          -2,
        )}-${mEnd.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${mEnd
        .getFullYear()
        .toString()
        .slice(-2)}`;
      current.setMonth(current.getMonth() + size);
    } else {
      label = current.getFullYear().toString();
      current.setFullYear(current.getFullYear() + 1);
    }

    buckets[label] = 0;
  }

  return buckets;
};

// getGroupingPipeline
export const getGroupingPipeline = (
  resolution: string,
  size: number,
  start: Date,
): any => {
  if (resolution === 'day') {
    return {
      year: { $year: { date: '$createdAt', timezone: TZ } },
      month: { $month: { date: '$createdAt', timezone: TZ } },
      day: { $dayOfMonth: { date: '$createdAt', timezone: TZ } },
    };
  }

  if (resolution === 'multiDay') {
    return {
      bucket: {
        $floor: {
          $divide: [
            {
              $dateDiff: {
                startDate: start,
                endDate: '$createdAt',
                unit: 'day',
                timezone: TZ,
              },
            },
            size,
          ],
        },
      },
    };
  }

  if (resolution === 'month') {
    return {
      year: { $year: { date: '$createdAt', timezone: TZ } },
      month: { $month: { date: '$createdAt', timezone: TZ } },
    };
  }

  if (resolution === 'multiMonth') {
    return {
      year: { $year: { date: '$createdAt', timezone: TZ } },
      bucket: {
        $floor: {
          $divide: [
            {
              $subtract: [{ $month: { date: '$createdAt', timezone: TZ } }, 1],
            },
            size,
          ],
        },
      },
    };
  }

  return {
    year: { $year: { date: '$createdAt', timezone: TZ } },
  };
};

// mapGrowthToTimeline
export const mapGrowthToTimeline = ({
  growth,
  timelineMap,
  start,
  end,
  resolution,
  size,
}: MapGrowthParams) => {
  growth.forEach((item: any) => {
    const id = item._id;
    let label = '';

    if (resolution === 'day') {
      const utcDate = new Date(Date.UTC(id.year, id.month - 1, id.day));
      label = utcDate
        .toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          timeZone: TZ,
        })
        .replace(' ', '');
    } else if (resolution === 'multiDay') {
      const bucketStart = new Date(start);
      bucketStart.setDate(start.getDate() + id.bucket * size);

      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + size - 1);
      const finalEnd = bucketEnd > end ? end : bucketEnd;

      label = `${bucketStart.getDate()}${bucketStart.toLocaleString('en-US', { month: 'short', timeZone: TZ })}-${finalEnd.getDate()}${finalEnd.toLocaleString('en-US', { month: 'short', timeZone: TZ })}`;
    } else if (resolution === 'month') {
      const utcDate = new Date(Date.UTC(id.year, id.month - 1, 1));
      label = `${utcDate.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${id.year.toString().slice(-2)}`;
    } else if (resolution === 'multiMonth') {
      const mStart = new Date(start);
      mStart.setMonth(mStart.getMonth() + id.bucket * size);

      const mEnd = new Date(mStart);
      mEnd.setMonth(mEnd.getMonth() + size - 1);

      label = `${mStart.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${mStart
        .getFullYear()
        .toString()
        .slice(
          -2,
        )}-${mEnd.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${mEnd
        .getFullYear()
        .toString()
        .slice(-2)}`;
    } else {
      label = id.year.toString();
    }

    if (timelineMap[label] !== undefined) {
      timelineMap[label] = item.count;
    }
  });

  return Object.entries(timelineMap).map(([time, value]) => ({
    time,
    value,
  }));
};

// getAdminVendorReportAnalytics
export const getAdminVendorReportAnalytics = async (
  timeframe?: string,
  fromDate?: string | Date,
  toDate?: string | Date,
) => {
  const { start, end, resolution, size } = getReportTimeframe(
    timeframe,
    fromDate,
    toDate,
  );

  const timelineMap = generateEmptyBuckets(start, end, resolution, size);
  const groupId = getGroupingPipeline(resolution, size, start);

  const growthMatch: any = { isDeleted: false };
  if (start) {
    growthMatch.createdAt = { $gte: start, $lte: end };
  }

  const [analyticsResult] = await Vendor.aggregate([
    {
      $facet: {
        statusStats: [
          { $match: { isDeleted: false } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        growth: [
          { $match: growthMatch },
          { $group: { _id: groupId, count: { $sum: 1 } } },
          {
            $sort: {
              '_id.year': 1,
              '_id.month': 1,
              '_id.day': 1,
              '_id.bucket': 1,
            },
          },
        ],
      },
    },
  ]);

  const analytics = analyticsResult || { statusStats: [], growth: [] };

  const getCount = (status: string) =>
    (analytics.statusStats || []).find((s: any) => s._id === status)?.count ||
    0;

  const vendorGrowths = mapGrowthToTimeline({
    growth: analytics.growth || [],
    timelineMap,
    start,
    end,
    resolution,
    size,
  }).map((item) => ({
    time: item.time,
    vendors: item.value,
  }));

  const approved = getCount('APPROVED');
  const pending = getCount('PENDING');
  const submitted = getCount('SUBMITTED');
  const rejected = getCount('REJECTED');
  const blocked = getCount('BLOCKED');

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Vendor Report' },
    data: {
      stats: {
        totalVendors: approved + pending + submitted + rejected + blocked,
        approvedVendors: approved,
        pendingVendors: pending,
        blockedVendors: blocked + rejected,
      },
      vendorGrowths,
      statusDistribution: {
        approved,
        pending,
        submitted,
        rejected,
        blocked,
      },
    },
  };
};
