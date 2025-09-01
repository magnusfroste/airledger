import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const UserProfile = () => {
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-4 px-4">
      <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
        <User className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Användare'}
        </p>
        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
      </div>
    </div>
  );
};

export default UserProfile;