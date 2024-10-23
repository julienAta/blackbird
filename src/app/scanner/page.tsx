// app/page.tsx
import { TokenScanner } from "@/components/token-scanner/token-scanner";
import { fetchSolPrice } from "../actions/token";
import {
  HydrationBoundary,
  dehydrate,
  QueryClient,
} from "@tanstack/react-query";

async function PumpScannerPage() {
  const queryClient = new QueryClient();

  // Prefetch SOL price
  await queryClient.prefetchQuery({
    queryKey: ["solPrice"],
    queryFn: fetchSolPrice,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TokenScanner />
    </HydrationBoundary>
  );
}

export default PumpScannerPage;
