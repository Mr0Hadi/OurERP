import axiosInstance from "@/shared/services/api/axios";

export const authApi = {
  login: async ({ username, password }) => {
    const { data } = await axiosInstance.post("/auth/login", {
      username,
      password,
    });
    return data;
  },

  logout: async () => {
    const { data } = await axiosInstance.post("/auth/logout");
    return data;
  },

  me: async () => {
    const { data } = await axiosInstance.get("/auth/me");
    return data;
  },
};