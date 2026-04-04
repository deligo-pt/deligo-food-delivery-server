import { TDeliveryPartner } from "../Delivery-Partner/delivery-partner.interface";
import { TFleetManager } from "../Fleet-Manager/fleet-manager.interface";

export interface TMeta {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
}

export interface TimeframeQuery {
    timeframe?: "last7days" | "last14days" | "last30days";
}
export interface SummaryFacet {
    totalRevenue: number;
    completedOrders: number;
    cancelledOrders: number;
}

export interface DailyRevenueFacet {
    _id: string;
    revenue: number;
}

export interface SalesAnalyticsResponse {
    summary: {
        totalRevenue: number;
        completedOrders: number;
        cancelledOrders: number;
        avgOrderValue: number;
    };
    revenueCards: {
        thisWeek: number;
        thisMonth: number;
        topEarningDay: string;
    };
    charts: {
        revenueTrend: { date: string; revenue: number }[];
        earningsByDay: { date: string; revenue: number }[];
    };
}


export interface OrderReportAnalyticsResponse {
    summary: {
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
    };

    ordersByZone: {
        zone: string;
        orders: number;
    }[];

    revenueTrend: {
        date: string;
        revenue: number;
    }[];

    zoneHeatmap: {
        zone: string;
        hour: number;
        orderCount: number;
    }[];
};

export type TVendorSalesReport = {
    stats: {
        totalSales: number;
        totalOrders: number;
        avgOrderValue: number;
    };
    salesData: {
        name: string;
        sales: number;
        orders: number;
    }[];
};

// for fleet manager performance analysis
export type TFleetManagerPerformance = Pick<
    TFleetManager,
    | "_id"
    | "profilePhoto"
    | "userId"
    | "email"
    | "status"
    | "name"
    | "address"
    | "operationalData"
> & {
    totalDeliveries: number;
    totalEarnings: number;
};
export type TFleetPerformanceStat = {
    mostOrders: {
        fleetName: string;
        fleetPhoto: string;
        ordersCount: number;
    };
    highestRating: {
        fleetName: string;
        fleetPhoto: string;
        rating: {
            average: number;
            totalRatings: number;
        };
    };
    highestEarnings: {
        fleetName: string;
        fleetPhoto: string;
        earnings: number;
    };
};
export type TFleetWeeklyPerformance = {
    day: string;
    totalOrders: number;
    totalEarnings: number;
};
export type TTopFleetPerformers = {
    fleetName: string;
    fleetPhoto: string;
    rating: number;
    totalEarnings: number;
};

export type TFleetPerformanceData = {
    data: {
        fleetPerformance: TFleetManagerPerformance[];
        fleetPerformanceStat: TFleetPerformanceStat;
        fleetWeeklyPerformance: TFleetWeeklyPerformance[];
        topFleetPerformers: TTopFleetPerformers[];
    };
    meta: TMeta;
};

// for delivery partner performance analytics
export type TDeliveryPartnerPerformance = Pick<
    TDeliveryPartner,
    | "_id"
    | "profilePhoto"
    | "userId"
    | "email"
    | "status"
    | "name"
    | "address"
    | "operationalData"
> & {
    totalDeliveries: number;
    rating: number;
    totalEarnings: number;
};

export type TPartnerPerformanceStat = {
    mostOrders: {
        partnerName: string;
        partnerPhoto: string;
        ordersCount: number;
    };
    highestRated: {
        partnerName: string;
        partnerPhoto: string;
        rating: {
            average: number;
            totalRatings: number;
        };
    };
    highestEarnings: {
        partnerName: string;
        partnerPhoto: string;
        earnings: number;
    };
};

export type TPartnerMonthlyPerformance = {
    month: string;
    totalOrders: number;
};

export type TTopPartnerPerformers = {
    earnings: number;
    initials: string;
    name: string;
    rating: number;
    profilePhoto: string;
};

export type TPartnerPerformanceData = {
    partnerPerformance: TDeliveryPartnerPerformance[];
    topCards: TPartnerPerformanceStat;
    earningsPerformance: TPartnerMonthlyPerformance[];
    topPerformers: TTopPartnerPerformers[];
};

export type TPartnerPerformanceDetailsData = {
    partnerPerformance: TDeliveryPartnerPerformance;
    partnerMonthlyPerformance: TPartnerMonthlyPerformance[];
}

// ---> for top vendors analytics
export type TVendorPerformance = {
    vendorId: string;
    vendorName: string;

    totalOrders: number;      // total number of orders
    totalRevenue: number;     // total revenue generated

    averageRating: number;    // avg customer rating (1-5)
    preparationTime: number;  // avg prep time in minutes

    cancelRate: number;       // % of cancelled orders
    satisfactionScore: number; // custom score (0-100 or %)
};

// Top selling vendors (ranked)
export type TTopSellingVendor = {
    vendorId: string;
    vendorName: string;
    totalOrders: number;
    totalRevenue: number;
};

// Vendor rating distribution
export type TVendorRatingDistribution = {
    vendorName: string;
    rating: number;
};

export type TVendorInsights = {
    topSellingVendors: TTopSellingVendor[];

    vendorPerformance: TVendorPerformance[];

    ratingDistribution: TVendorRatingDistribution[];
};

// --> get admin delivery insights
// Summary metrics (top cards)
export type TDeliverySummary = {
    averageDeliveryTime: number; // in minutes
    lateDeliveryPercentage: number; // % of late deliveries
    rejectedDeliveryPercentage: number; // % of rejected deliveries
};

// Rider performance
export type TRiderPerformance = {
    riderId: string;
    riderName: string;
    totalDeliveries: number;
    successfulDeliveries: number;
    rejectedDeliveries: number;
    averageTime: number; // avg delivery time in minutes
};

// Distance vs Time (for scatter/line chart)
export type TDistanceTimeAnalysis = {
    distanceKm: number;
    averageTime: number;
};

// Area performance (slow delivery detection)
export type TAreaDeliveryPerformance = {
    area: string;
    averageTime: number;
    latePercentage: number;
};

// Rider idle time
export type TRiderIdleTime = {
    riderId: string;
    riderName: string;
    idleTimeMinutes: number; // total idle time in selected period
};

// rejected deliveries breakdown
export type TRejectedDeliveryReason = {
    reason: string;
    count: number;
};
export type TDeliveryInsights = {
    summary: TDeliverySummary;

    riderPerformance: TRiderPerformance[];
    distanceTimeAnalysis: TDistanceTimeAnalysis[];
    areaPerformance: TAreaDeliveryPerformance[];
    riderIdleTime: TRiderIdleTime[];
    rejectedReasons: TRejectedDeliveryReason[];
};

// ---> get customer insights
// Summary (top cards)
export type TCustomerSummary = {
    newCustomers: number;
    returningCustomers: number;
    churnRate: number;
    averageCLV: number;
};

// Active users
export type TActiveUsers = {
    dau: number; // Daily Active Users
    wau: number; // Weekly Active Users
    mau: number; // Monthly Active Users
};

// Top customers (highest spenders)
export type TTopCustomer = {
    customerId: string;
    name: string;
    totalSpent: number;
    totalOrders: number;
};

// Order frequency (per user per week)
export type TOrderFrequency = {
    range: string; // e.g. "1 order", "2-3 orders", "5+ orders"
    userCount: number;
};

// Hourly order pattern (peak time detection)
export type THourlyOrders = {
    hour: number; // 0 - 23
    orderCount: number;
};

export type TCustomerInsights = {
    summary: TCustomerSummary;

    activeUsers: TActiveUsers;

    topCustomers: TTopCustomer[];

    orderFrequency: TOrderFrequency[];

    hourlyOrders: THourlyOrders[];
};