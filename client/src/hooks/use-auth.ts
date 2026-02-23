import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

async function syncPendingQuizData() {
  try {
    const pending = localStorage.getItem("intertexe_pending_quiz");
    if (!pending) return;

    const data = JSON.parse(pending);
    await api.submitQuiz({
      materials: data.materials,
      priceRange: data.priceRange,
      syntheticTolerance: data.syntheticTolerance,
      favoriteBrands: data.favoriteBrands,
      profileType: data.profileType,
      recommendation: data.recommendation,
    });
    localStorage.removeItem("intertexe_pending_quiz");
  } catch (err) {
    console.error("Failed to sync pending quiz:", err);
  }
}

async function syncLocalProductFavorites() {
  try {
    const stored = localStorage.getItem("intertexe_product_favorites");
    if (!stored) return;
    const localIds: string[] = JSON.parse(stored);
    if (localIds.length === 0) return;
    const merged = await api.syncProductFavorites(localIds);
    localStorage.setItem("intertexe_product_favorites", JSON.stringify(merged));
  } catch (err) {
    console.error("Failed to sync product favorites:", err);
  }
}

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
    onSuccess: async () => {
      await syncPendingQuizData();
      await syncLocalProductFavorites();
      await queryClient.refetchQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["quizResults"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["product-favorites"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string; name?: string }) =>
      api.signup(data),
    onSuccess: async () => {
      await syncPendingQuizData();
      await syncLocalProductFavorites();
      await queryClient.refetchQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["quizResults"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["product-favorites"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["quizResults"] });
      queryClient.invalidateQueries({ queryKey: ["product-favorites"] });
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
