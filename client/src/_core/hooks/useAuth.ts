import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      console.log("[useAuth] Logging out...");
      await logoutMutation.mutateAsync();
      console.log("[useAuth] Logout mutation successful");
    } catch (error: unknown) {
      console.error("[useAuth] Logout error:", error);
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // Already logged out, continue
        return;
      }
      // Continue even if logout fails
    } finally {
      // Clear all queries and cache
      console.log("[useAuth] Clearing all queries and cache...");
      queryClient.clear();
      
      // Invalidate all tRPC queries
      await utils.invalidate();
      
      // Clear all data
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      
      // Clear localStorage
      localStorage.removeItem("manus-runtime-user-info");
      
      // Redirect to login page
      if (typeof window !== "undefined") {
        console.log("[useAuth] Redirecting to login...");
        window.location.href = "/login";
      }
    }
  }, [logoutMutation, utils, queryClient]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    const loginUrl = redirectPath ?? getLoginUrl();
    if (!loginUrl) return;
    if (window.location.href === loginUrl) return;

    window.location.href = loginUrl;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
