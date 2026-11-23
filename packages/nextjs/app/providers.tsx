"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { hardhat } from "wagmi/chains";


const config = createConfig({
  chains: [hardhat],
  transports: { [hardhat.id]: http("http://127.0.0.1:8545") },
  connectors: [injected({ target: "metaMask" })],
  multiInjectedProviderDiscovery: false,
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queries] = useState(() => new QueryClient());
  return <WagmiProvider config={config} reconnectOnMount={false}>
    <QueryClientProvider client={queries}>{children}</QueryClientProvider>
  </WagmiProvider>;
}

