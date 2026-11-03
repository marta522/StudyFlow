import axios from "axios";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"
).replace(/\/+$/, "");
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL must be set for production builds.");
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

let csrfToken: string | null = null;

export function clearCsrfToken() {
  csrfToken = null;
}

api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes(config.method?.toLowerCase() ?? "")) {
    if (!csrfToken) {
      const { data } = await axios.get<{ csrfToken: string }>(
        `${apiBaseUrl}/auth/csrf`,
        { withCredentials: true },
      );
      csrfToken = data.csrfToken;
    }

    config.headers.set("X-CSRF-Token", csrfToken);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const requestUrl = (response.config.url ?? "").split("?")[0];
    if (
      requestUrl.endsWith("/auth/login") ||
      requestUrl.endsWith("/auth/register") ||
      requestUrl.endsWith("/auth/logout")
    ) {
      clearCsrfToken();
    }
    return response;
  },
  (error: unknown) => {
    const requestUrl = axios.isAxiosError(error)
      ? (error.config?.url ?? "").split("?")[0]
      : "";
    const isExcludedAuthRequest = [
      "/auth/login",
      "/auth/register",
      "/auth/change-password",
      "/auth/profile",
    ].some((path) => requestUrl.endsWith(path));
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !isExcludedAuthRequest
    ) {
      clearCsrfToken();
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
