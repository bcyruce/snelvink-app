"use client";

import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppUserProfile = {
  role: string;
  restaurant_id: string;
  is_email_verified: boolean;
};

export type AppRestaurant = {
  name: string;
  plan_type: string;
  invite_code: string;
};

export type UserContextValue = {
  user: User | null;
  profile: AppUserProfile | null;
  restaurant: AppRestaurant | null;
  isFreePlan: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

type ProfileQueryRow = {
  role: string;
  restaurant_id: string;
  is_email_verified: boolean | null;
  restaurants: AppRestaurant | AppRestaurant[] | null;
};

function normalizeRestaurant(
  nested: ProfileQueryRow["restaurants"],
): AppRestaurant | null {
  if (!nested) return null;
  if (Array.isArray(nested)) return nested[0] ?? null;
  return nested;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [restaurant, setRestaurant] = useState<AppRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfileForUser = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null);
      setRestaurant(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "role, restaurant_id, is_email_verified, restaurants(name, plan_type, invite_code)",
      )
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profiel ophalen mislukt:", error);
      setProfile(null);
      setRestaurant(null);
      return;
    }

    const row = data as ProfileQueryRow | null;
    if (!row) {
      setProfile(null);
      setRestaurant(null);
      return;
    }

    setProfile({
      role: row.role,
      restaurant_id: row.restaurant_id,
      is_email_verified: row.is_email_verified === true,
    });
    setRestaurant(normalizeRestaurant(row.restaurants));
  }, []);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const nextUser = session?.user ?? null;
    setUser(nextUser);
    await loadProfileForUser(nextUser);
  }, [loadProfileForUser]);

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: Session | null) => {
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      await loadProfileForUser(nextUser);
      if (mounted) setIsLoading(false);
    };

    void (async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applySession(session);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setIsLoading(true);
      await applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfileForUser]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      restaurant,
      isFreePlan: restaurant?.plan_type === "free",
      isLoading,
      refresh,
    }),
    [user, profile, restaurant, isLoading, refresh],
  );

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser moet binnen UserProvider gebruikt worden");
  }
  return ctx;
}
