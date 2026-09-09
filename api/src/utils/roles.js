export const VALID_ROLES = ["user", "staff", "admin"];

export const isAdmin = (role) => role === "admin";

export const canModerate = (role) => role === "admin" || role === "staff";
