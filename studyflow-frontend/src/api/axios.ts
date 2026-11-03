import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (import.meta.env.PROD && !apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL must be set for production builds.");
}

const api = axios.create({
  baseURL: apiBaseUrl ?? "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const requestUrl = axios.isAxiosError(error)
      ? (error.config?.url ?? "").split("?")[0]
      : "";
    const isExcludedAuthRequest = [
      "/auth/login",
      "/auth/register",
      "/auth/change-password",
    ].some((path) => requestUrl.endsWith(path));
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      localStorage.getItem("token") &&
      !isExcludedAuthRequest
    ) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        sessionStorage.setItem(
          "sessionExpired",
          "Sesja wygasła. Zaloguj się ponownie, aby kontynuować.",
        );
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
