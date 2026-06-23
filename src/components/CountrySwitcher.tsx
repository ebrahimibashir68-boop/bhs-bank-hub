import { COUNTRIES, COUNTRY_LIST, type CountryCode } from "@/lib/banking";
import { useBank } from "@/lib/store";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function CountrySwitcher() {
  const { activeCountry, setActiveCountry } = useBank();
  const [open, setOpen] = useState(false);
  const c = COUNTRIES[activeCountry];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium"
      >
        <span className="text-base leading-none">{c.flag}</span>
        <span>{c.code}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {COUNTRY_LIST.map((country) => (
            <button
              key={country.code}
              onClick={() => {
                setActiveCountry(country.code as CountryCode);
                setOpen(false);
              }}
              className={`flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent ${
                country.code === activeCountry ? "bg-accent" : ""
              }`}
            >
              <span className="text-xl">{country.flag}</span>
              <div className="flex-1">
                <div className="font-medium">{country.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {country.centralBank} • {country.currency}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
