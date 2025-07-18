import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings as SettingsIcon, User, Shield, Save, Crown, Calculator, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  is_developer: boolean | null;
}

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, updatePreferences, loading: preferencesLoading } = useUserPreferences();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          username: data.username || '',
        });
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          username: user.user_metadata?.username || user.email?.split('@')[0] || '',
          is_developer: false,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;

        setProfile(createdProfile);
        setFormData({
          full_name: createdProfile.full_name || '',
          username: createdProfile.username || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta profilinformation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Sparat!",
        description: "Dina inställningar har uppdaterats.",
      });

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        full_name: formData.full_name,
        username: formData.username,
      } : null);

    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara inställningar. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAccountingMethodChange = async (method: 'cash' | 'accrual') => {
    try {
      setSaving(true);
      await updatePreferences({ accountingMethod: method });
      toast({
        title: "Sparat!",
        description: `Bokföringsmetoden har ändrats till ${method === 'cash' ? 'kontantmetoden' : 'fakturametoden'}.`,
      });
    } catch (error) {
      console.error('Error updating accounting method:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera bokföringsmetod. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || preferencesLoading) {
    return (
      <div className="container px-6 py-6 max-w-4xl mx-auto">
        <div className="animate-fade-in space-y-6">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-6 py-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inställningar</h1>
          <p className="text-muted-foreground mt-1">
            Hantera ditt konto och dina preferenser
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profilinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Fullständigt namn</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Ditt fullständiga namn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Användarnamn</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Ditt användarnamn"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>E-postadress</Label>
              <Input
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                E-postadressen kan inte ändras här. Kontakta support om du behöver ändra den.
              </p>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Sparar...' : 'Spara ändringar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Bokföringsinställningar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="accounting-method">Bokföringsmetod</Label>
                <Select
                  value={preferences.accountingMethod}
                  onValueChange={(value: 'cash' | 'accrual') => handleAccountingMethodChange(value)}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accrual">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Fakturametoden (Periodmässig)</span>
                        <span className="text-xs text-muted-foreground">Standard för de flesta företag</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Kontantmetoden (Kassamässig)</span>
                        <span className="text-xs text-muted-foreground">För små företag och enskilda firmor</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Information about cash method */}
              {preferences.accountingMethod === 'cash' && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <div className="space-y-2">
                      <p className="font-medium">Viktigt om kontantmetoden (bokslutsmetoden)</p>
                      <div className="text-sm space-y-1">
                        <p>• <strong>3-miljonersregeln:</strong> Aktiebolag med nettoomsättning över 3 miljoner SEK under räkenskapsåret får INTE använda kontantmetoden</p>
                        <p>• Endast tillåten för enskilda näringsidkare och vissa små företag</p>
                        <p>• Handelsbolag får använda kontantmetoden om alla delägare är fysiska personer</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-amber-200">
                        <ExternalLink className="h-3 w-3" />
                        <a 
                          href="https://www.fortnox.se/fortnox-foretagsguide/driva-foretag/bokforing/bokforing" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs underline hover:no-underline"
                        >
                          Läs mer om bokföringsregler hos Fortnox
                        </a>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {preferences.accountingMethod === 'cash' ? 'Kontantmetoden (Bokslutsmetoden)' : 'Fakturametoden (Periodmässig)'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {preferences.accountingMethod === 'cash' 
                      ? 'Intäkter och kostnader bokförs när betalning sker. Fokus på kassaflöde och faktiska in- och utbetalningar. Kallas även "bokslutsmetoden".'
                      : 'Intäkter och kostnader bokförs när de uppstår enligt prestationsprincipen. Standard för de flesta företag enligt BFN:s regelverk.'
                    }
                  </p>
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {preferences.accountingMethod === 'cash' ? 'Får användas av:' : 'Måste användas av:'}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {preferences.accountingMethod === 'cash' ? (
                        <>
                          <li>• Enskilda näringsidkare (oavsett omsättning)</li>
                          <li>• Handelsbolag där alla delägare är fysiska personer</li>
                          <li>• Aktiebolag med nettoomsättning UNDER 3 miljoner SEK</li>
                          <li>• Enklare kassaflödesredovisning och bokslut</li>
                        </>
                      ) : (
                        <>
                          <li>• Aktiebolag med nettoomsättning över 3 miljoner SEK</li>
                          <li>• Alla börsnoterade företag</li>
                          <li>• Företag som omfattas av årsredovisningslagen</li>
                          <li>• Krav på periodisering enligt BFN och årsredovisningslagen</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Kontoinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Konto-ID</h4>
                <p className="text-sm text-muted-foreground">{profile?.id}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Kontotyp</h4>
                <p className="text-sm text-muted-foreground">
                  {profile?.is_developer ? 'Utvecklarkonto' : 'Användarkonto'}
                </p>
              </div>
              {profile?.is_developer && (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Utvecklare
                </Badge>
              )}
            </div>

            {profile?.is_developer && (
              <>
                <Separator />
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-orange-600" />
                    <h4 className="font-medium text-orange-800">Utvecklarfunktioner</h4>
                  </div>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Skapa och hantera systemmallar</li>
                    <li>• Tillgång till alla transaktionsmallar</li>
                    <li>• Avancerade inställningar och funktioner</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Applikationsinställningar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Språk</h4>
                <p className="text-sm text-muted-foreground">Svenska (sv-SE)</p>
              </div>
              <Badge variant="outline">Standard</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Valuta</h4>
                <p className="text-sm text-muted-foreground">Svenska kronor (SEK)</p>
              </div>
              <Badge variant="outline">Standard</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Tidszon</h4>
                <p className="text-sm text-muted-foreground">Europa/Stockholm</p>
              </div>
              <Badge variant="outline">Auto</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;