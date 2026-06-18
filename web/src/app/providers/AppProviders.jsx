// src/providers/AppProviders.jsx
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from '@/shared/components/theme/theme-provider';
import { ToastProvider } from './ToastProvider';

export function AppProviders({ children }) {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {children}
        <ToastProvider />
      </ThemeProvider>
    </QueryProvider>
  );
}