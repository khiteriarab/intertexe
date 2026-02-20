import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      api.login(data.username, data.password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
  });

  const signupMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string; name?: string }) =>
      api.signup(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation,
    signup: signupMutation,
    logout: logoutMutation,
  };
}
