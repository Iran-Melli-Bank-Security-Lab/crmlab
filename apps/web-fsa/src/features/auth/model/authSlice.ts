import { createSlice } from "@reduxjs/toolkit";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeGetStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Auth state in Redux is still valid for the current session.
  }
}

function safeRemoveStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures during logout.
  }
}

const userFromStorage = safeParse(safeGetStorageItem("user"), null);

const initialState = {
  user: userFromStorage,
  isAuthenticated: Boolean(userFromStorage),
};

const normalizeUser = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return {
    ...user,
    roles,
    permissions,
  };
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const { user } = action.payload;
      const normalizedUser = normalizeUser(user);

      state.user = normalizedUser;
      state.isAuthenticated = Boolean(normalizedUser);

      safeSetStorageItem("user", JSON.stringify(normalizedUser));
    },

    updateUser: (state, action) => {
      const normalizedUser = normalizeUser({ ...state.user, ...action.payload });
      state.user = normalizedUser;
      safeSetStorageItem("user", JSON.stringify(normalizedUser));
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;

      safeRemoveStorageItem("user");
    },
  },
});

export const { loginSuccess, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
