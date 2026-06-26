import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer from "@/features/auth/model/authSlice";
import notificationsReducer from "@/features/notifications/model/notificationsSlice";
import uiReducer from "@/features/ui-state/model/uiSlice";
import { api } from "@/shared/api/baseApi";

const rootReducer = combineReducers({
  auth: authReducer,
  notifications: notificationsReducer,
  ui: uiReducer,
  [api.reducerPath]: api.reducer,
});

export function setupStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    preloadedState,
  });
}

export const store = setupStore();
setupListeners(store.dispatch);
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore["dispatch"];
