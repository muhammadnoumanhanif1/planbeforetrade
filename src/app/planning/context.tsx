"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ExchangeId } from "@/lib/exchanges";
import { getLivePrice } from "@/lib/livePrice";

interface PlanningContextType {
  exchange: ExchangeId;
  setExchange: (ex: ExchangeId) => void;
  coin: string;
  setCoin: (c: string) => void;
  livePrice: number | null;
  loadingPrice: boolean;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [exchange, setExchange] = useState<ExchangeId>("binance");
  const [coin, setCoin] = useState<string>("BTC");
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPrice = async () => {
      if (!coin) return;
      setLoadingPrice(true);
      try {
        const symbolToFetch = coin.toUpperCase().endsWith("USDT") ? coin.toUpperCase() : `${coin.toUpperCase()}USDT`;
        const price = await getLivePrice(symbolToFetch, exchange);
        if (isMounted) {
          setLivePrice(price);
        }
      } catch (error) {
        console.error("Failed to fetch global planning price", error);
      } finally {
        if (isMounted) {
          setLoadingPrice(false);
        }
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [coin, exchange]);

  return (
    <PlanningContext.Provider value={{ exchange, setExchange, coin, setCoin, livePrice, loadingPrice }}>
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanningContext() {
  const context = useContext(PlanningContext);
  if (context === undefined) {
    throw new Error("usePlanningContext must be used within a PlanningProvider");
  }
  return context;
}
