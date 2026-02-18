import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, User, Shield, Save, Crown, Building2 } from "lucide-react";
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
  fiscal_year_start: number;
  company_type: string;
}

const COMPANY_TYPE_OPTIONS = [
  { value: 'enskild_firma', label: 'Enskild firma' },
  { value: 'aktiebolag', label: 'Aktiebolag (AB)' },
  { value: 'handelsbolag', label: 'Handelsbolag (HB)' },
] as const;

const FISCAL_YEAR_OPTIONS = [
  { value: 1, label: "Kalenderår (jan–dec)" },
  { value: 5, label: "Brutet: maj–apr" },
  { value: 7, label: "Brutet: jul–jun" },
  { value: 9, label: "Brutet: sep–aug" },
] as const;

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
    company_type: 'enskild_firma',
    fiscal_year_start: 1,
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
          company_type: data.company_type || 'enskild_firma',
          fiscal_year_start: data.fiscal_year_start ?? 1,
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
          company_type: createdProfile.company_type || 'enskild_firma',
          fiscal_year_start: createdProfile.fiscal_year_start ?? 1,
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
      // Reset fiscal year to calendar if enskild firma
      const fiscalYear = formData.company_type === 'enskild_firma' ? 1 : formData.fiscal_year_start;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          company_type: formData.company_type,
          fiscal_year_start: fiscalYear,
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
        company_type: formData.company_type,
        fiscal_year_start: fiscalYear,
      } : null);

      // Also update local form to reflect the forced calendar year
      if (formData.company_type === 'enskild_firma') {
        setFormData(prev => ({ ...prev, fiscal_year_start: 1 }));
      }

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


  if (loading || preferencesLoading) {
    return (
      <div className="container px-3 py-3 sm:px-6 sm:py-6 max-w-4xl mx-auto">
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
    <div className="container px-3 py-3 sm:px-6 sm:py-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
        <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Inställningar</h1>
          <p className="text-muted-foreground mt-1">
            Hantera ditt konto och dina preferenser
          </p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
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

            {/* Bolagsform */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="company_type">Bolagsform</Label>
              </div>
              <Select
                value={formData.company_type}
                onValueChange={(v) => {
                  setFormData(prev => ({
                    ...prev,
                    company_type: v,
                    // Force calendar year for enskild firma
                    fiscal_year_start: v === 'enskild_firma' ? 1 : prev.fiscal_year_start,
                  }));
                }}
              >
                <SelectTrigger id="company_type" className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Räkenskapsår */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="fiscal_year">Räkenskapsår</Label>
              </div>
              {formData.company_type === 'enskild_firma' ? (
                <>
                  <Input value="Kalenderår (jan–dec)" disabled className="bg-muted w-full sm:w-72" />
                  <p className="text-xs text-muted-foreground">
                    Enskild firma måste använda kalenderår.
                  </p>
                </>
              ) : (
                <>
                  <Select
                    value={String(formData.fiscal_year_start)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, fiscal_year_start: Number(v) }))}
                  >
                    <SelectTrigger id="fiscal_year" className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FISCAL_YEAR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    AB och HB kan välja brutet räkenskapsår.
                  </p>
                </>
              )}
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