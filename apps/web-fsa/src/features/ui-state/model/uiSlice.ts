import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ProjectTableContextSettings = {
  visibleColumns: string[];
  columnOrder: string[];
  aliases: Record<string, string>;
};

export type ProjectTableSettings = Record<string, ProjectTableContextSettings>;

if (typeof window !== "undefined") {
  try {
    [
      "crmlab:project-table-columns:v1",
      "crmlab:project-table-column-order:v1",
      "crmlab:project-table-column-aliases:v1",
    ].forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // The API-backed settings remain available when browser storage is disabled.
  }
}

type UiState = {
  drawerOpen: boolean;
  sidebarOpen: boolean;
  theme: string;
  visibleProjectColumns: Record<string, string[]>;
  projectTableColumnOrder: Record<string, string[]>;
  projectTableColumnAliases: Record<string, Record<string, string>>;
  projectTableSettingsUserId: string | null;
};

const initialState: UiState = {
  drawerOpen: false,
  sidebarOpen: true,
  theme: localStorage.getItem("theme") || "light",
  visibleProjectColumns: {},
  projectTableColumnOrder: {},
  projectTableColumnAliases: {},
  projectTableSettingsUserId: null,
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
    hydrateProjectTableSettings: (
      state,
      action: PayloadAction<{ userId: string; settings: ProjectTableSettings }>
    ) => {
      state.projectTableSettingsUserId = action.payload.userId;
      state.visibleProjectColumns = {};
      state.projectTableColumnOrder = {};
      state.projectTableColumnAliases = {};
      Object.entries(action.payload.settings).forEach(([context, settings]) => {
        state.visibleProjectColumns[context] = settings.visibleColumns;
        state.projectTableColumnOrder[context] = settings.columnOrder;
        state.projectTableColumnAliases[context] = settings.aliases;
      });
    },
    setProjectTableVisibleColumns: (
      state,
      action: PayloadAction<{ paginationId: string; columns: string[] }>
    ) => {
      state.visibleProjectColumns[action.payload.paginationId] = action.payload.columns;
    },
    setProjectTableColumnOrder: (
      state,
      action: PayloadAction<{ paginationId: string; columns: string[] }>
    ) => {
      state.projectTableColumnOrder[action.payload.paginationId] = action.payload.columns;
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
    },
    resetProjectTableColumnAlias: (
      state,
      action: PayloadAction<{ paginationId: string; columnKey: string }>
    ) => {
      const aliases = state.projectTableColumnAliases[action.payload.paginationId];
      if (aliases) {
        delete aliases[action.payload.columnKey];
      }
    },
    resetProjectTableVisibleColumns: (state, action: PayloadAction<string>) => {
      delete state.visibleProjectColumns[action.payload];
      delete state.projectTableColumnOrder[action.payload];
      delete state.projectTableColumnAliases[action.payload];
    },
  },
});

export const {
  closeDrawer,
  openDrawer,
  toggleSidebar,
  setTheme,
  hydrateProjectTableSettings,
  setProjectTableVisibleColumns,
  setProjectTableColumnOrder,
  setProjectTableColumnAlias,
  resetProjectTableColumnAlias,
  resetProjectTableVisibleColumns,
} = uiSlice.actions;
export default uiSlice.reducer;
