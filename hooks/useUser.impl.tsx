"use client";

import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  plan: string | null;
  plan_status: string | null;
  plan_period_end: string | null;
  opening_hours: unknown | null;
  closed_days: unknown | null;
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

// 模块级缓存：避免路由切换时 UserProvider 重挂导致瞬间回到 loading。
let cachedUserState: {
  initialized: boolean;
  user: User | null;
  profile: AppUserProfile | null;
  restaurant: AppRestaurant | null;
} = {
  initialized: false,
  user: null,
  profile: null,
  restaurant: null,
};

function normalizeRestaurant(
  nested: ProfileQueryRow["restaurants"],
): AppRestaurant | null {
  if (!nested) return null;
  if (Array.isArray(nested)) return nested[0] ?? null;
  return nested;
}

// Geef een Supabase-achtige Promise een harde timeout zodat we nooit
// oneindig wachten wanneer het netwerk of de client hapert.
function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} time-out na ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => cachedUserState.user);
  const [profile, setProfile] = useState<AppUserProfile | null>(
    () => cachedUserState.profile,
  );
  const [restaurant, setRestaurant] = useState<AppRestaurant | null>(
    () => cachedUserState.restaurant,
  );
  const [isLoading, setIsLoading] = useState(() => !cachedUserState.initialized);

  const currentUserIdRef = useRef<string | null>(null);

  const loadProfileForUser = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setProfile(null);
      setRestaurant(null);
      cachedUserState = {
        ...cachedUserState,
        profile: null,
        restaurant: null,
      };
      return;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select(
            "role, restaurant_id, is_email_verified, restaurants(name, plan_type, invite_code, plan, plan_status, plan_period_end, opening_hours, closed_days)",
          )
          .eq("id", authUser.id)
          .maybeSingle(),
        10_000,
        "Profiel ophalen",
      );

      if (error) {
        console.warn(
          "Profiel ophalen mislukt (app blijft bruikbaar zonder profiel):",
          error.message,
        );
        setProfile(null);
        setRestaurant(null);
        cachedUserState = {
          ...cachedUserState,
          profile: null,
          restaurant: null,
        };
        return;
      }

      const row = data as ProfileQueryRow | null;
      if (!row) {
        setProfile(null);
        setRestaurant(null);
        cachedUserState = {
          ...cachedUserState,
          profile: null,
          restaurant: null,
        };
        return;
      }

      const nextProfile = {
        role: row.role,
        restaurant_id: row.restaurant_id,
        is_email_verified: row.is_email_verified === true,
      };
      setProfile(nextProfile);
      cachedUserState = {
        ...cachedUserState,
        profile: nextProfile,
      };

      let nextRestaurant = normalizeRestaurant(row.restaurants);

      // Fallback: embed kan null zijn door RLS, schema-cache of een
      // ontbrekende FK-relatie. Probeer dan direct een query op restaurants.
      if (!nextRestaurant && row.restaurant_id) {
        try {
          const { data: restaurantData, error: restaurantError } =
            await withTimeout(
              supabase
                .from("restaurants")
                .select(
                  "name, plan_type, invite_code, plan, plan_status, plan_period_end, opening_hours, closed_days",
                )
                .eq("id", row.restaurant_id)
                .maybeSingle(),
              10_000,
              "Restaurant ophalen",
            );

          if (restaurantError) {
            console.warn(
              "Restaurant direct ophalen mislukt:",
              restaurantError.message,
            );
          } else if (restaurantData) {
            nextRestaurant = restaurantData as AppRestaurant;
          }
        } catch (restaurantErr) {
          console.warn("Restaurant direct ophalen mislukt:", restaurantErr);
        }
      }

      setRestaurant(nextRestaurant);
      cachedUserState = {
        ...cachedUserState,
        restaurant: nextRestaurant,
      };
    } catch (error) {
      console.warn("Profiel ophalen mislukt:", error);
      setProfile(null);
      setRestaurant(null);
      cachedUserState = {
        ...cachedUserState,
        profile: null,
        restaurant: null,
      };
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await withTimeout(
        supabase.auth.getSession(),
        10_000,
        "getSession",
      );
      const nextUser = session?.user ?? null;
      currentUserIdRef.current = nextUser?.id ?? null;
      setUser(nextUser);
      cachedUserState = {
        ...cachedUserState,
        user: nextUser,
      };
      await loadProfileForUser(nextUser);
    } catch (error) {
      console.warn("Sessie verversen mislukt:", error);
    }
  }, [loadProfileForUser]);

  useEffect(() => {
    let mounted = true;

    const applySession = async (session: Session | null) => {
      if (!mounted) return;
      try {
        const nextUser = session?.user ?? null;
        currentUserIdRef.current = nextUser?.id ?? null;
        setUser(nextUser);
        cachedUserState = {
          ...cachedUserState,
          user: nextUser,
        };
        await loadProfileForUser(nextUser);
      } catch (error) {
        console.warn("Sessie toepassen mislukt:", error);
      } finally {
        if (mounted) setIsLoading(false);
        cachedUserState = {
          ...cachedUserState,
          initialized: true,
        };
      }
    };

    void (async () => {
      try {
        if (!cachedUserState.initialized) {
          setIsLoading(true);
        } else if (mounted) {
          setIsLoading(false);
        }
        const {
          data: { session },
        } = await withTimeout(
          supabase.auth.getSession(),
          10_000,
          "Initiële getSession",
        );
        await applySession(session);
      } catch (error) {
        console.warn("Initiële sessie ophalen mislukt:", error);
        if (mounted) setIsLoading(false);
        cachedUserState = {
          ...cachedUserState,
          initialized: true,
        };
      }
    })();

    // BELANGRIJK: supabase-js houdt tijdens deze callback een interne lock vast.
    // Als we hier `await supabase.xxx` doen, ontstaat er een deadlock (typisch
    // zichtbaar na het wisselen van browser-tabs → TOKEN_REFRESHED event).
    // Daarom werken we alleen met de session die we meekrijgen en deferren we
    // eventuele vervolg-Supabase-calls buiten de lock via setTimeout(..., 0).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      const nextUser = session?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const prevUserId = currentUserIdRef.current;
      currentUserIdRef.current = nextUserId;
      setUser(nextUser);

      // Alleen profiel opnieuw laden wanneer de gebruiker daadwerkelijk wisselt
      // (login, logout, account-switch). TOKEN_REFRESHED / USER_UPDATED voor
      // dezelfde user hoeven de UI niet terug in "laden..." te zetten.
      const userChanged = nextUserId !== prevUserId;
      const shouldReload =
        userChanged ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION";

      if (!shouldReload) return;

      setTimeout(() => {
        if (!mounted) return;
        void applySession(session);
      }, 0);
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
      isFreePlan:
        (restaurant?.plan ?? restaurant?.plan_type ?? "free") === "free",
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
