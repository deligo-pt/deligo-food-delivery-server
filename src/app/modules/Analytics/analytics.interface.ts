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
