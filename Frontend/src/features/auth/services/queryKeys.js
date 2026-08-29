// src/features/auth/services/queryKeys.js
export const authKeys = {
  all: ["auth"],
  session: () => [...authKeys.all, "session"],
};
