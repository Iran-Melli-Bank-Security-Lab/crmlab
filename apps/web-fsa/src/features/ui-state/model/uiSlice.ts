import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const PROJECT_TABLE_COLUMNS_STORAGE_KEY = "crmlab:project-table-columns:v1";
const PROJECT_TABLE_COLUMN_ORDER_STORAGE_KEY = "crmlab:project-table-column-order:v1";
const PROJECT_TABLE_COLUMN_ALIASES_STORAGE_KEY = "crmlab:project-table-column-aliases:v1";

type UiState = {
  drawerOpen: boolean;
  sidebarOpen: boolean;
  theme: string;
  visibleProjectColumns: Record<string, string[]>;
  projectTableColumnOrder: Record<string, string[]>;
  projectTableColumnAliases: Record<string, Record<string, string>>;
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

function getStoredProjectTableColumnAliases(): Record<string, Record<string, string>> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(PROJECT_TABLE_COLUMN_ALIASES_STORAGE_KEY) || "{}"
    ) as Record<string, unknown>;
    const result: Record<string, Record<string, string>> = {};

    Object.entries(parsed).forEach(([paginationId, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      result[paginationId] = Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      );
    });

    return result;
  } catch {
    return {};
  }
}

function storeProjectTableColumnAliases(value: Record<string, Record<string, string>>) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      PROJECT_TABLE_COLUMN_ALIASES_STORAGE_KEY,
      JSON.stringify(value)
    );
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
  projectTableColumnAliases: getStoredProjectTableColumnAliases(),
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
    setProjectTableColumnAlias: (
      state,
      action: PayloadAction<{
        paginationId: string;
        columnKey: string;
        alias: string;
      }>
    ) => {
      const { paginationId, columnKey, alias } = action.payload;
      const aliases = state.projectTableColumnAliases[paginationId] ?? {};
      if (alias) aliases[columnKey] = alias;
      else delete aliases[columnKey];
      state.projectTableColumnAliases[paginationId] = aliases;
      storeProjectTableColumnAliases(state.projectTableColumnAliases);
    },
    resetProjectTableColumnAlias: (
      state,
      action: PayloadAction<{ paginationId: string; columnKey: string }>
    ) => {
      const aliases = state.projectTableColumnAliases[action.payload.paginationId];
      if (aliases) {
        delete aliases[action.payload.columnKey];
        storeProjectTableColumnAliases(state.projectTableColumnAliases);
      }
    },
    resetProjectTableVisibleColumns: (state, action: PayloadAction<string>) => {
      delete state.visibleProjectColumns[action.payload];
      delete state.projectTableColumnOrder[action.payload];
      delete state.projectTableColumnAliases[action.payload];
      storeProjectTableColumns(PROJECT_TABLE_COLUMNS_STORAGE_KEY, state.visibleProjectColumns);
      storeProjectTableColumns(
        PROJECT_TABLE_COLUMN_ORDER_STORAGE_KEY,
        state.projectTableColumnOrder
      );
      storeProjectTableColumnAliases(state.projectTableColumnAliases);
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
  setProjectTableColumnAlias,
  resetProjectTableColumnAlias,
  resetProjectTableVisibleColumns,
} = uiSlice.actions;
export default uiSlice.reducer;
