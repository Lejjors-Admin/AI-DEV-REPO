const isBrowser = typeof window !== "undefined";

export const DEV_BYPASS_AUTH =
  import.meta.env.DEV && isBrowser
    ? window.localStorage.getItem("DEV_BYPASS_AUTH") !== "false"
    : false;

export const DEV_BYPASS_USER = {
  id: 1,
  username: "dev-admin",
  name: "Dev Admin",
  email: "dev-admin@example.com",
  role: "firm_admin",
  avatar: null,
  department: "Engineering",
  position: "Developer",
  firmId: 1,
  clientId: null,
};
