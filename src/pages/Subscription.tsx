import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionCard from "@/components/SubscriptionCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function Subscription() {
  const { subscription, usage, loading, error, refresh } = useSubscription();

  if (loading) {
    return (
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Prenumeration</h1>
          <p className="text-muted-foreground">Hantera din prenumeration och se användningsstatistik</p>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Prenumeration</h1>
          <p className="text-muted-foreground">Hantera din prenumeration och se användningsstatistik</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Fel vid hämtning av prenumerationsdata
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Prenumeration</h1>
        <p className="text-muted-foreground">Hantera din prenumeration och se användningsstatistik</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 max-w-2xl">
        <SubscriptionCard 
          subscription={subscription || undefined}
          usage={usage || undefined}
          onRefresh={refresh}
        />
        
        {/* Usage History Card - Future enhancement */}
        <Card>
          <CardHeader>
            <CardTitle>Användningshistorik</CardTitle>
            <CardDescription>
              Översikt över din månatliga användning av AI-analyser
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>Användningshistorik kommer snart...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}