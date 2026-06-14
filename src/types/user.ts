export type SubscriptionPlanId = "esnaf" | "buyuyen";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export interface UserSession {
  isLoggedIn: boolean;
  hasActiveSubscription: boolean;
  userName: string | null;
  userId: string | null;
  accessToken: string | null;
  activePlan: SubscriptionPlanId | null;
  isAuthReady: boolean;
}
