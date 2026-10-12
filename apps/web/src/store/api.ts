import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { RootState } from "./index";
import { handleLocalDemoRequest } from "./local-demo-engine";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token =
      state.ui.token ||
      (typeof window !== "undefined" ? localStorage.getItem("gstock_token") : null);
    const orgId =
      state.ui.activeOrganizationId ||
      (typeof window !== "undefined" ? localStorage.getItem("gstock_org_id") : null);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (orgId) {
      headers.set("X-Organization-Id", orgId);
    }
    return headers;
  },
});

const baseQueryWithLocalDemoFallback: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // If running on GitHub Pages (*.github.io) or if backend is unreachable, fall back to browser-persisted [DÉMO] engine
  const isGitHubPages =
    typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

  if (!isGitHubPages) {
    const result = await rawBaseQuery(args, api, extraOptions);
    if (!result.error || result.error.status !== "FETCH_ERROR") {
      return result;
    }
  }

  const normalizedArgs = typeof args === "string" ? { url: args, method: "GET" } : args;
  return handleLocalDemoRequest(
    normalizedArgs.url,
    normalizedArgs.method || "GET",
    normalizedArgs.body,
    normalizedArgs.params as Record<string, any> | undefined
  ) as any;
};

export const gstockApi = createApi({
  reducerPath: "gstockApi",
  baseQuery: baseQueryWithLocalDemoFallback,
  tagTypes: [
    "Me",
    "Organization",
    "Members",
    "Products",
    "Categories",
    "Units",
    "Warehouses",
    "Balances",
    "Movements",
    "Inventories",
    "Reports",
    "Alerts",
    "Appearance",
    "Billing",
    "Audit",
    "Admin",
  ],
  endpoints: (builder) => ({
    getMe: builder.query<any, void>({
      query: () => "/me",
      providesTags: ["Me", "Appearance"],
    }),
    login: builder.mutation<any, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    register: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: ["Me"],
    }),
    logout: builder.mutation<any, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    getCurrentOrganization: builder.query<any, void>({
      query: () => "/organizations/current",
      providesTags: ["Organization"],
    }),
    createOrganization: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/organizations", method: "POST", body }),
      invalidatesTags: ["Me", "Organization"],
    }),
    updateOrganizationSettings: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: "/organizations/current/settings",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Me", "Organization", "Reports"],
    }),
    getOrganizationModules: builder.query<any, void>({
      query: () => "/organizations/current/modules",
      providesTags: ["Organization"],
    }),
    updateOrganizationModules: builder.mutation<any, { activeModules: string[] }>({
      query: (body) => ({
        url: "/organizations/current/modules",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Me", "Organization"],
    }),
    getMembers: builder.query<any, void>({
      query: () => "/organizations/current/members",
      providesTags: ["Members"],
    }),
    inviteMember: builder.mutation<
      any,
      { email: string; name?: string; roleCode: string }
    >({
      query: (body) => ({
        url: "/organizations/current/members/invite",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Members", "Billing"],
    }),
    updateMemberRole: builder.mutation<
      any,
      { membershipId: string; roleCode: string }
    >({
      query: ({ membershipId, roleCode }) => ({
        url: `/organizations/current/members/${membershipId}/role`,
        method: "PATCH",
        body: { roleCode },
      }),
      invalidatesTags: ["Members"],
    }),
    getProducts: builder.query<
      any,
      {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        stockStatus?: string;
        sortBy?: string;
        sortOrder?: string;
      }
    >({
      query: (params) => ({ url: "/products", params }),
      providesTags: ["Products"],
    }),
    createProduct: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: ["Products", "Reports", "Alerts", "Billing"],
    }),
    updateProduct: builder.mutation<
      any,
      { id: string; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Products", "Reports", "Alerts"],
    }),
    importProductsCsv: builder.mutation<any, { csvContent: string }>({
      query: (body) => ({
        url: "/products/import/csv",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Products", "Reports", "Billing"],
    }),
    getCategories: builder.query<any, void>({
      query: () => "/categories",
      providesTags: ["Categories"],
    }),
    createCategory: builder.mutation<
      any,
      { code: string; name: string; parentId?: string | null }
    >({
      query: (body) => ({ url: "/categories", method: "POST", body }),
      invalidatesTags: ["Categories", "Products"],
    }),
    getUnits: builder.query<any, void>({
      query: () => "/units",
      providesTags: ["Units"],
    }),
    createUnit: builder.mutation<
      any,
      { code: string; name: string; dimension: string; precision: number }
    >({
      query: (body) => ({ url: "/units", method: "POST", body }),
      invalidatesTags: ["Units"],
    }),
    createUnitConversion: builder.mutation<
      any,
      { fromUnitId: string; toUnitId: string; factor: number }
    >({
      query: (body) => ({ url: "/units/conversions", method: "POST", body }),
      invalidatesTags: ["Units"],
    }),
    getWarehouses: builder.query<any, void>({
      query: () => "/warehouses",
      providesTags: ["Warehouses"],
    }),
    createWarehouse: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/warehouses", method: "POST", body }),
      invalidatesTags: ["Warehouses", "Reports", "Billing"],
    }),
    createLocation: builder.mutation<
      any,
      { warehouseId: string; code: string; locationType: string }
    >({
      query: (body) => ({ url: "/locations", method: "POST", body }),
      invalidatesTags: ["Warehouses"],
    }),
    getBalances: builder.query<
      any,
      { warehouseId?: string; productId?: string; search?: string } | void
    >({
      query: (params) => ({ url: "/stock/balances", params: params || {} }),
      providesTags: ["Balances"],
    }),
    getMovements: builder.query<
      any,
      {
        page?: number;
        limit?: number;
        movementType?: string;
        warehouseId?: string;
        search?: string;
      }
    >({
      query: (params) => ({ url: "/stock/movements", params }),
      providesTags: ["Movements"],
    }),
    createReceipt: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/stock/receipts", method: "POST", body }),
      invalidatesTags: [
        "Balances",
        "Movements",
        "Products",
        "Reports",
        "Alerts",
        "Audit",
      ],
    }),
    createIssue: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/stock/issues", method: "POST", body }),
      invalidatesTags: [
        "Balances",
        "Movements",
        "Products",
        "Reports",
        "Alerts",
        "Audit",
      ],
    }),
    createTransfer: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/stock/transfers", method: "POST", body }),
      invalidatesTags: [
        "Balances",
        "Movements",
        "Products",
        "Reports",
        "Alerts",
        "Audit",
      ],
    }),
    createAdjustment: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({ url: "/stock/adjustments", method: "POST", body }),
      invalidatesTags: [
        "Balances",
        "Movements",
        "Products",
        "Reports",
        "Alerts",
        "Audit",
      ],
    }),
    reverseMovement: builder.mutation<
      any,
      { id: string; idempotencyKey: string; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/stock/movements/${id}/reverse`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Balances",
        "Movements",
        "Products",
        "Reports",
        "Alerts",
        "Audit",
      ],
    }),
    getInventories: builder.query<any, void>({
      query: () => "/inventories",
      providesTags: ["Inventories"],
    }),
    createInventory: builder.mutation<
      any,
      { warehouseId: string; notes?: string }
    >({
      query: (body) => ({ url: "/inventories", method: "POST", body }),
      invalidatesTags: ["Inventories", "Audit"],
    }),
    submitInventoryCounts: builder.mutation<
      any,
      {
        id: string;
        lines: Array<{
          productId: string;
          locationId: string;
          countedQuantity: number;
        }>;
      }
    >({
      query: ({ id, lines }) => ({
        url: `/inventories/${id}/counts`,
        method: "POST",
        body: { lines },
      }),
      invalidatesTags: ["Inventories"],
    }),
    validateInventory: builder.mutation<any, { id: string }>({
      query: ({ id }) => ({
        url: `/inventories/${id}/validate`,
        method: "POST",
      }),
      invalidatesTags: [
        "Inventories",
        "Balances",
        "Movements",
        "Products",
        "Reports",
        "Alerts",
        "Audit",
      ],
    }),
    getReportsOverview: builder.query<any, { days?: number } | void>({
      query: (params) => ({ url: "/reports/overview", params: params || {} }),
      providesTags: ["Reports"],
    }),
    getStockValueReport: builder.query<any, void>({
      query: () => "/reports/stock-value",
      providesTags: ["Reports"],
    }),
    getStockAlerts: builder.query<any, void>({
      query: () => "/alerts/stock",
      providesTags: ["Alerts"],
    }),
    getAuditLogs: builder.query<any, void>({
      query: () => "/audit-logs",
      providesTags: ["Audit"],
    }),
    getAppearance: builder.query<any, void>({
      query: () => "/settings/appearance",
      providesTags: ["Appearance"],
    }),
    updateAppearance: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: "/settings/appearance",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Appearance", "Me", "Organization", "Audit"],
    }),
    uploadBrandingLogo: builder.mutation<
      any,
      { fileName: string; mimeType: string; fileContentBase64: string }
    >({
      query: (body) => ({
        url: "/settings/branding/logo",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appearance", "Me", "Organization"],
    }),
    updateUserPreferences: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: "/settings/preferences",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Appearance", "Me"],
    }),
    getBillingPlans: builder.query<any, void>({
      query: () => "/billing/plans",
      providesTags: ["Billing"],
    }),
    getSubscription: builder.query<any, void>({
      query: () => "/billing/subscription",
      providesTags: ["Billing"],
    }),
    checkoutPlan: builder.mutation<any, { planCode: string }>({
      query: (body) => ({
        url: "/billing/checkout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Billing", "Me", "Organization", "Audit"],
    }),
    getAdminOverview: builder.query<any, void>({
      query: () => "/admin/overview",
      providesTags: ["Admin"],
    }),
    adminUpdateOrgStatus: builder.mutation<
      any,
      {
        id: string;
        status?: "ACTIVE" | "SUSPENDED";
        subscriptionStatus?: string;
        planCode?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/organizations/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Admin", "Billing", "Organization"],
    }),
    adminUpdatePlan: builder.mutation<
      any,
      {
        id: string;
        price?: number;
        maxMembers?: number;
        maxWarehouses?: number;
        maxProducts?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/plans/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Admin", "Billing"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationSettingsMutation,
  useGetOrganizationModulesQuery,
  useUpdateOrganizationModulesMutation,
  useGetMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useImportProductsCsvMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetUnitsQuery,
  useCreateUnitMutation,
  useCreateUnitConversionMutation,
  useGetWarehousesQuery,
  useCreateWarehouseMutation,
  useCreateLocationMutation,
  useGetBalancesQuery,
  useGetMovementsQuery,
  useCreateReceiptMutation,
  useCreateIssueMutation,
  useCreateTransferMutation,
  useCreateAdjustmentMutation,
  useReverseMovementMutation,
  useGetInventoriesQuery,
  useCreateInventoryMutation,
  useSubmitInventoryCountsMutation,
  useValidateInventoryMutation,
  useGetReportsOverviewQuery,
  useGetStockValueReportQuery,
  useGetStockAlertsQuery,
  useGetAuditLogsQuery,
  useGetAppearanceQuery,
  useUpdateAppearanceMutation,
  useUploadBrandingLogoMutation,
  useUpdateUserPreferencesMutation,
  useGetBillingPlansQuery,
  useGetSubscriptionQuery,
  useCheckoutPlanMutation,
  useGetAdminOverviewQuery,
  useAdminUpdateOrgStatusMutation,
  useAdminUpdatePlanMutation,
} = gstockApi;
