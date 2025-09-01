import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const useSignOut = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Utloggad",
        description: "Du har loggats ut framgångsrikt.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Fel",
        description: "Kunde inte logga ut. Försök igen.",
        variant: "destructive",
      });
    }
  };

  return { handleSignOut };
};