import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => {
        // Never retry auth/permission errors.
        if (error instanceof ApiClientError && [401, 403, 404, 429].includes(error.status)) return false;
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
