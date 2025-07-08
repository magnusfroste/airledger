import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_category: string;
  normal_balance: string;
}

interface AccountSelectorProps {
  value?: string; // account_code
  onValueChange: (accountCode: string, accountName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filter?: 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'all';
  showAccountNumbers?: boolean;
}

export function AccountSelector({ 
  value, 
  onValueChange, 
  placeholder = "Välj konto...",
  disabled = false,
  filter = 'all',
  showAccountNumbers = true
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        let query = supabase
          .from('airledger_chart_of_accounts')
          .select('*')
          .eq('is_active', true)
          .order('account_code', { ascending: true });

        if (filter !== 'all') {
          query = query.eq('account_type', filter);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching accounts:', error);
          return;
        }

        setAccounts(data || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [filter]);

  const selectedAccount = accounts.find(account => account.account_code === value);

  const handleSelect = (account: Account) => {
    onValueChange(account.account_code, account.account_name);
    setOpen(false);
  };

  if (loading) {
    return (
      <Button
        variant="outline"
        role="combobox"
        disabled
        className="w-full justify-between"
      >
        Laddar konton...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedAccount
            ? showAccountNumbers 
              ? `${selectedAccount.account_name} (${selectedAccount.account_code})`
              : selectedAccount.account_name
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök konto..." />
          <CommandList>
            <CommandEmpty>Inget konto hittades.</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.account_code} ${account.account_name}`}
                  onSelect={() => handleSelect(account)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedAccount?.account_code === account.account_code
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {showAccountNumbers 
                        ? `${account.account_name} (${account.account_code})`
                        : account.account_name}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {account.account_type} • {account.normal_balance}
                      {showAccountNumbers && ` • Konto ${account.account_code}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}