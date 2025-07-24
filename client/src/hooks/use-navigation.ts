import { useLocation } from "wouter";

export function useNavigation() {
  const [, setLocation] = useLocation();

  // Store the previous path when navigating
  const navigateWithHistory = (path: string) => {
    setLocation(path);
  };

  // Navigate back to employee dashboard (admins always start there)
  const navigateToDashboard = () => {
    setLocation("/employee");
  };

  return {
    navigateWithHistory,
    navigateToDashboard
  };
}