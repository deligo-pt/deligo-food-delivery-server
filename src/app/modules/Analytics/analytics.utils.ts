/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Calculates the date range and grouping resolution.
 * If timeframe is null/undefined, it defaults to "all time" logic.
 */

type MapGrowthParams = {
    growth: any[];
    timelineMap: Record<string, number>;
    start: Date;
    end: Date;
    resolution: 'day' | 'multiDay' | 'month' | 'multiMonth' | 'year';
    size: number;
};

const TZ = 'Europe/Lisbon';

export const getReportTimeframe = (
    timeframe?: string,
    fromDate?: string | Date,
    toDate?: string | Date
) => {
    const now = new Date();
    const end: Date = toDate ? new Date(toDate) : now;
    let start: Date;

    // DEFAULT CASE (NO TIMEFRAME)
    if (!timeframe && !fromDate) {
        start = new Date();
        start.setDate(start.getDate() - (365 - 1)); // last 1 year
    }

    // CUSTOM RANGE
    else if (timeframe === 'custom' && fromDate) {
        start = new Date(fromDate);
    }
    // PREDEFINED TIMEFRAMES
    else {
        let days = 7;

        if (timeframe === 'last14days') days = 14;
        else if (timeframe === 'last30days') days = 30;
        else if (timeframe === 'last90days') days = 90;
        else if (timeframe === 'last1year') days = 365;

        start = new Date();
        start.setDate(start.getDate() - (days - 1)); // correct range
    }

    start.setHours(0, 0, 0, 0);

    // DETERMINE RANGE
    const diffDays = Math.ceil(
        Math.abs(end.getTime() - start.getTime()) / (1000 * 3600 * 24)
    );

    // DETERMINE RESOLUTION
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
/**
 * Generates the full timeline labels with 0 values to ensure no missing dates.
 */
export const generateEmptyBuckets = (
    start: Date,
    end: Date,
    resolution: string,
    size: number
) => {
    const buckets: Record<string, number> = {};
    const current = new Date(start);

    while (current <= end) {
        let label = '';

        if (resolution === 'day') {
            label = current.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                timeZone: TZ
            }).replace(' ', '');

            current.setDate(current.getDate() + 1);
        }

        else if (resolution === 'multiDay') {
            const dStart = new Date(current);
            const dEnd = new Date(current);
            dEnd.setDate(dEnd.getDate() + size - 1);

            const finalEnd = dEnd > end ? end : dEnd;

            label = `${dStart.getDate()}${dStart.toLocaleString('en-US', { month: 'short', timeZone: TZ })}-${finalEnd.getDate()}${finalEnd.toLocaleString('en-US', { month: 'short', timeZone: TZ })}`;

            current.setDate(current.getDate() + size);
        }

        else if (resolution === 'month') {
            label = `${current.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${current
                .getFullYear()
                .toString()
                .slice(-2)}`;

            current.setMonth(current.getMonth() + 1);
        }

        else if (resolution === 'multiMonth') {
            const mStart = new Date(current);
            const mEnd = new Date(current);
            mEnd.setMonth(mEnd.getMonth() + size - 1);

            label = `${mStart.toLocaleString('en-US', { month: 'short', timeZone: TZ })}/${mStart
                .getFullYear()
                .toString()
                .slice(-2)}-${mEnd.toLocaleString('en-US', {
                    month: 'short',
                    timeZone: TZ
                })}/${mEnd.getFullYear().toString().slice(-2)}`;

            current.setMonth(current.getMonth() + size);
        }

        else {
            label = current.getFullYear().toString();
            current.setFullYear(current.getFullYear() + 1);
        }

        buckets[label] = 0;
    }

    return buckets;
};

/**
 * Generates the Mongo $group _id object based on resolution.
 */
export const getGroupingPipeline = (
    resolution: string,
    size: number,
    start: Date
): any => {

    if (resolution === 'day') {
        return {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
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
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
        };
    }

    if (resolution === 'multiMonth') {
        return {
            year: { $year: '$createdAt' },
            bucket: {
                $floor: {
                    $divide: [{ $subtract: [{ $month: '$createdAt' }, 1] }, size],
                },
            },
        };
    }

    return {
        year: { $year: '$createdAt' },
    };
};

// growth: the raw aggregation result from MongoDB
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

        // DAY
        if (resolution === 'day') {
            label = new Date(id.year, id.month - 1, id.day)
                .toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                .replace(' ', '');
        }

        // MULTI DAY
        else if (resolution === 'multiDay') {
            const bucketStart = new Date(start);
            bucketStart.setDate(start.getDate() + id.bucket * size);

            const bucketEnd = new Date(bucketStart);
            bucketEnd.setDate(bucketStart.getDate() + size - 1);

            const finalEnd = bucketEnd > end ? end : bucketEnd;

            label = `${bucketStart.getDate()}${bucketStart.toLocaleString('en-US', {
                month: 'short',
            })}-${finalEnd.getDate()}${finalEnd.toLocaleString('en-US', {
                month: 'short',
            })}`;
        }

        // MONTH
        else if (resolution === 'month') {
            label = `${new Date(id.year, id.month - 1)
                .toLocaleString('en-US', { month: 'short' })}/${id.year
                    .toString()
                    .slice(-2)}`;
        }

        // MULTI MONTH
        else if (resolution === 'multiMonth') {
            const mStart = new Date(id.year, id.bucket * size);
            const mEnd = new Date(id.year, id.bucket * size + size - 1);

            label = `${mStart.toLocaleString('en-US', { month: 'short' })}/${mStart
                .getFullYear()
                .toString()
                .slice(-2)}-${mEnd.toLocaleString('en-US', {
                    month: 'short',
                })}/${mEnd.getFullYear().toString().slice(-2)}`;
        }

        // YEAR
        else {
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