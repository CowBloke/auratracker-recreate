import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { queryClient } from './lib/query';
import { router } from './router';
import { useAuth } from './stores/auth';
import './styles.css';

function App() {
  const refresh = useAuth((s) => s.refresh);
  // Resolve the current session once on boot; the router reacts to phase changes.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
