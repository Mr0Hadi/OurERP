export const authKeys = {
  all: ["auth"],
  session: () => [...authKeys.all, "session"],
};
