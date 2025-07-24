interface ColorThemeProviderProps {
  children: React.ReactNode;
}

export function ColorThemeProvider({ children }: ColorThemeProviderProps) {
  return <>{children}</>;
}