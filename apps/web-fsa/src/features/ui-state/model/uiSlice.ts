import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const PROJECT_TABLE_COLUMNS_STORAGE_KEY = "crmlab:project-table-columns:v1";

type UiState = {
  drawerOpen: boolean;
  sidebarOpen: boolean;
  theme: string;
  visibleProjectColumns: Record<string, string[]>;
};

function getStoredProjectTableColumns(): Record<string, string[]> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PROJECT_TABLE_COLUMNS_STORAGE_KEY) || "{}"
    ) as Record<string, unknown>;

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string[]] =>
          Array.isArray(entry[1]) && entry[1].every((key) => typeof key === "string")
      )
    );
  } catch {
    return {};
  }
}

function storeProjectTableColumns(value: Record<string, string[]>) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROJECT_TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(value));
  }
}

const initialState: UiState = {
  drawerOpen: false,
  sidebarOpen: true,
  theme: localStorage.getItem("theme") || "light",
  visibleProjectColumns: getStoredProjectTableColumns(),
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
    setProjectTableVisibleColumns: (
      state,
      action: PayloadAction<{ paginationId: string; columns: string[] }>
    ) => {
      state.visibleProjectColumns[action.payload.paginationId] = action.payload.columns;
      storeProjectTableColumns(state.visibleProjectColumns);
    },
    resetProjectTableVisibleColumns: (state, action: PayloadAction<string>) => {
      delete state.visibleProjectColumns[action.payload];
      storeProjectTableColumns(state.visibleProjectColumns);
    },
  },
});

export const {
  closeDrawer,
  openDrawer,
  toggleSidebar,
  setTheme,
  setProjectTableVisibleColumns,
  resetProjectTableVisibleColumns,
} = uiSlice.actions;
export default uiSlice.reducer;
