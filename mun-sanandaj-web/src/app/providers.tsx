import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import faIR from "antd/locale/fa_IR";
import { AuthProvider } from "../auth/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider direction="rtl" locale={faIR}>
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
