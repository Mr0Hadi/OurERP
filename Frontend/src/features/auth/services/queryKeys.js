export const authKeys = {
  all: ["auth"],
  session: () => [...authKeys.all, "session"],
  myPermissions: () => [...authKeys.all, "myPermissions"],
};
