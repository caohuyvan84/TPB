
  import { createRoot } from "react-dom/client";
  import { QueryClientProvider } from '@tanstack/react-query';
  import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
  import { queryClient } from './lib/query-client';
  import { AuthProvider } from "./contexts/AuthContext";
  import { AppRouter } from "./components/AppRouter";
  import { Toaster } from './components/ui/sonner';
  import "./index.css";

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-right" />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
  