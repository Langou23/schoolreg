// Simple helper pour centraliser la logique d'autorisation côté front
import { UserProfile } from "../types";

export function isAdminLike(user?: UserProfile) {
  if (!user) return false;
  return user.role === "admin" || user.role === "direction";
}

export function isEndUser(user?: UserProfile) {
  if (!user) return false;
  return user.role === "parent" || user.role === "student";
}
