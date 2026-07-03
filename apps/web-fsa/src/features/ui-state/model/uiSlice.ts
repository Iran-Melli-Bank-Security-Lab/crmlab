import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const PROJECT_TABLE_COLUMNS_STORAGE_KEY = "crmlab:project-table-columns:v1";
const PROJECT_TABLE_COLUMN_ORDER_STORAGE_KEY = "crmlab:project-table-column-order:v1";

type UiState = {
  drawerOpen: boolean;
  sidebarOpen: boolean;
  theme: string;
  visibleProjectColumns: Record<string, string[]>;
  projectTableColumnOrder: Record<string, string[]>;
};

function getStoredProjectTableColumns(storageKey: string): Record<string, string[]> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(storageKey) || "{}"
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

function storeProjectTableColumns(storageKey: string, value: Record<string, string[]>) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  }
}

const initialState: UiState = {
  drawerOpen: false,
  sidebarOpen: true,
  theme: localStorage.getItem("theme") || "light",
  visibleProjectColumns: getStoredProjectTableColumns(PROJECT_TABLE_COLUMNS_STORAGE_KEY),
  projectTableColumnOrder: getStoredProjectTableColumns(
    PROJECT_TABLE_COLUMN_ORDER_STORAGE_KEY
  ),
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
      storeProjectTableColumns(PROJECT_TABLE_COLUMNS_STORAGE_KEY, state.visibleProjectColumns);
    },
    setProjectTableColumnOrder: (
      state,
      action: PayloadAction<{ paginationId: string; columns: string[] }>
    ) => {
      state.projectTableColumnOrder[action.payload.paginationId] = action.payload.columns;
      storeProjectTableColumns(
        PROJECT_TABLE_COLUMN_ORDER_STORAGE_KEY,
        state.projectTableColumnOrder
      );
    },
    resetProjectTableVisibleColumns: (state, action: PayloadAction<string>) => {
      delete state.visibleProjectColumns[action.payload];
      delete state.projectTableColumnOrder[action.payload];
      storeProjectTableColumns(PROJECT_TABLE_COLUMNS_STORAGE_KEY, state.visibleProjectColumns);
      storeProjectTableColumns(
        PROJECT_TABLE_COLUMN_ORDER_STORAGE_KEY,
        state.projectTableColumnOrder
      );
    },
  },
});

export const {
  closeDrawer,
  openDrawer,
  toggleSidebar,
  setTheme,
  setProjectTableVisibleColumns,
  setProjectTableColumnOrder,
  resetProjectTableVisibleColumns,
} = uiSlice.actions;
export default uiSlice.reducer;
