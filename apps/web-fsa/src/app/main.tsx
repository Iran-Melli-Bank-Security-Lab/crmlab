import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ChakraProvider } from "@chakra-ui/react";
import App from "@/app/App";
import { store } from "@/app/store/store";
import ErrorBoundary from "@/shared/ui/feedback/ErrorBoundary";
import { LanguageProvider } from "@/features/language/model";
import { startMockWorker } from "@/shared/mocks/startMockWorker";
import { system } from "@/shared/theme";
import { ColorModeProvider } from "@/shared/theme/colorMode";
import "@/app/styles/styles.css";

async function bootstrap() {
  await startMockWorker();

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ChakraProvider value={system}>
        <ColorModeProvider>
          <ErrorBoundary fallbackTitle="Application error">
            <Provider store={store}>
              <LanguageProvider>
                <BrowserRouter>
                  <App />
                  <Toaster position="top-right" />
                </BrowserRouter>
              </LanguageProvider>
            </Provider>
          </ErrorBoundary>
        </ColorModeProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
}

bootstrap();
