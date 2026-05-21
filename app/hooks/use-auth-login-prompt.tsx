"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AuthLoginPrompt } from "../components/AuthLoginPrompt";

type AuthPromptContextValue = {
  openLoginPrompt: () => void;
};

const AuthPromptContext = createContext<AuthPromptContextValue>({
  openLoginPrompt: () => {},
});

export function AuthLoginPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openLoginPrompt = useCallback(() => setOpen(true), []);

  return (
    <AuthPromptContext.Provider value={{ openLoginPrompt }}>
      {children}
      <AuthLoginPrompt open={open} onClose={() => setOpen(false)} />
    </AuthPromptContext.Provider>
  );
}

export function useAuthLoginPrompt() {
  return useContext(AuthPromptContext);
}
