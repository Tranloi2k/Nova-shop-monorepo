"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type CartDrawerCtx = {
  isOpen: boolean;
  hasOpened: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const CartDrawerContext = createContext<CartDrawerCtx>({
  isOpen: false,
  hasOpened: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function CartDrawerProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const open = useCallback(() => {
    setHasOpened(true);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (!v) setHasOpened(true);
      return !v;
    });
  }, []);

  const contextValue = useMemo(
    () => ({ isOpen, hasOpened, open, close, toggle }),
    [isOpen, hasOpened, open, close, toggle],
  );

  return (
    <CartDrawerContext.Provider
      value={contextValue}
    >
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  return useContext(CartDrawerContext);
}
