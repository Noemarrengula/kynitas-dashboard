import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Palette, Leaf, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "blue-marrengula" | "green";
  label: string;
  icon: React.ReactNode;
  description: string;
  colors?: string;
};

const themes: ThemeOption[] = [
  {
    value: "light",
    label: "Claro",
    icon: <Sun className="h-4 w-4" />,
    description: "Modo claro e limpo",
    colors: "bg-gradient-to-r from-white via-gray-50 to-white",
  },
  {
    value: "dark",
    label: "Escuro",
    icon: <Moon className="h-4 w-4" />,
    description: "Modo escuro Marrengula",
    colors: "bg-gradient-to-r from-slate-950 via-purple-900 to-slate-950",
  },
  {
    value: "blue-marrengula",
    label: "Azul Marrengula",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Tema profissional azul",
    colors: "bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900",
  },
  {
    value: "green",
    label: "Verde Natureza",
    icon: <Leaf className="h-4 w-4" />,
    description: "Tema verde sustentável",
    colors: "bg-gradient-to-r from-green-900 via-green-700 to-green-900",
  },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const currentTheme = themes.find(t => t.value === theme);
  const displayTheme = currentTheme || themes[1]; // Default to dark

  return (
    <DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          // Trigger dropdown via button
        }}
        className="hover-lift focus-ring rounded-full w-9 h-9 relative"
        asChild
      >
        <button
          className={cn(
            "relative h-9 w-9 rounded-full transition-all duration-300",
            "hover:shadow-md focus:outline-none"
          )}
          title={`Tema atual: ${displayTheme.label}`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {displayTheme.icon}
          </div>
        </button>
      </Button>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          TEMAS DISPONÍVEIS
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-2 p-2">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-md transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                theme === themeOption.value &&
                  "bg-primary text-primary-foreground ring-1 ring-primary"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{themeOption.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{themeOption.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {themeOption.description}
                  </div>
                  {themeOption.colors && (
                    <div
                      className={cn(
                        "mt-2 h-1.5 rounded-full w-full",
                        themeOption.colors
                      )}
                    />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
          Tema salvo em suas preferências
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
