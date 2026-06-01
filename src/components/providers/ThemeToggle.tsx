import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="hover-lift focus-ring rounded-full w-9 h-9"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 animate-pulse-soft" />
      ) : (
        <Moon className="h-4 w-4 animate-pulse-soft" />
      )}
    </Button>
  );
}
