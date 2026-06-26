import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  drawerOpen: false,
  sidebarOpen: true,
  theme: localStorage.getItem("theme") || "light",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    closeDrawer: (state) => {
      state.drawerOpen = false;
    },
    openDrawer: (state) => {
      state.drawerOpen = true;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem("theme", action.payload);
    },
  },
});

export const { closeDrawer, openDrawer, toggleSidebar, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
