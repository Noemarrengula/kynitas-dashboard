import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const {
    query,
    setQuery,
    searchResults,
    isOpen,
    openSearch,
    closeSearch,
    clearSearch
  } = useGlobalSearch();

  const handleResultSelect = (result: SearchResult) => {
    if (result.path) {
      navigate(result.path);
    }
    clearSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleResultSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        clearSearch();
        break;
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'product':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case 'customer':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'sale':
        return 'bg-purple-500/20 text-purple-600 border-purple-500/30';
      case 'table':
        return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case 'employee':
        return 'bg-gray-500/20 text-gray-600 border-gray-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'product':
        return 'Produto';
      case 'customer':
        return 'Cliente';
      case 'sale':
        return 'Venda';
      case 'table':
        return 'Mesa';
      case 'employee':
        return 'Funcionário';
      default:
        return type;
    }
  };

  return (
    <>
      {/* Desktop Search Trigger */}
      <Button
        variant="ghost"
        onClick={openSearch}
        className={cn(
          "hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground",
          "w-64 justify-start px-3 py-2 h-9",
          "border border-input bg-background hover:bg-accent",
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Buscar...</span>
        <div className="ml-auto flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            Ctrl K
          </kbd>
        </div>
      </Button>

      {/* Mobile Search Trigger */}
      <Button
        variant="outline"
        size="icon"
        onClick={openSearch}
        className="md:hidden h-9 w-9"
        title="Buscar"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={closeSearch}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Busca Global
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 py-4">
            <Input
              ref={inputRef}
              data-search-input
              placeholder="Digite para buscar produtos, clientes, vendas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full"
            />
          </div>

          {query.length >= 2 && (
            <div className="max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="px-2 pb-4">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultSelect(result)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        index === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="text-lg">{result.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{result.title}</p>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full border",
                            getTypeColor(result.type)
                          )}>
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum resultado encontrado</p>
                  <p className="text-sm">Tente usar termos diferentes</p>
                </div>
              )}
            </div>
          )}

          {query.length < 2 && (
            <div className="px-6 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Digite pelo menos 2 caracteres para buscar</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-1">
                  <span>🍺</span>
                  <span>Produtos</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>👤</span>
                  <span>Clientes</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🛒</span>
                  <span>Vendas</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🪑</span>
                  <span>Mesas</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}