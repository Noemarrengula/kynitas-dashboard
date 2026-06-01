import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigate('/sales'),
      description: 'Nova venda'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => navigate('/products/drinks'),
      description: 'Produtos'
    },
    {
      key: 'd',
      ctrlKey: true,
      action: () => navigate('/dashboard'),
      description: 'Dashboard'
    },
    {
      key: 'h',
      ctrlKey: true,
      action: () => navigate('/sales/history'),
      description: 'Histórico de vendas'
    },
    {
      key: 'c',
      ctrlKey: true,
      action: () => navigate('/customers'),
      description: 'Clientes'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => navigate('/reports'),
      description: 'Relatórios'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => navigate('/settings'),
      description: 'Configurações'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => showShortcutsHelp(),
      description: 'Mostrar atalhos'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => focusSearch(),
      description: 'Busca global'
    },
    {
      key: 'Escape',
      action: () => closeModals(),
      description: 'Fechar modais'
    }
  ];

  const showShortcutsHelp = useCallback(() => {
    const shortcutsList = shortcuts
      .map(s => `${s.ctrlKey ? 'Ctrl+' : ''}${s.altKey ? 'Alt+' : ''}${s.shiftKey ? 'Shift+' : ''}${s.key.toUpperCase()}: ${s.description}`)
      .join('\n');
    
    toast({
      title: '⌨️ Atalhos de Teclado',
      description: (
        <div className="space-y-1 text-xs">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between">
              <span className="font-mono bg-muted px-1 rounded">
                {shortcut.ctrlKey ? 'Ctrl+' : ''}
                {shortcut.altKey ? 'Alt+' : ''}
                {shortcut.shiftKey ? 'Shift+' : ''}
                {shortcut.key.toUpperCase()}
              </span>
              <span>{shortcut.description}</span>
            </div>
          ))}
        </div>
      ),
    });
  }, [shortcuts]);

  const focusSearch = useCallback(() => {
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else {
      toast({
        title: '🔍 Busca Global',
        description: 'Campo de busca não encontrado nesta página',
      });
    }
  }, []);

  const closeModals = useCallback(() => {
    // Fechar modais abertos
    const closeButtons = document.querySelectorAll('[data-dialog-close]');
    closeButtons.forEach(button => (button as HTMLElement).click());
    
    // Remover focus de elementos
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignorar se estiver digitando em um input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Permitir apenas alguns atalhos específicos em inputs
      if (event.key === 'Escape') {
        target.blur();
        return;
      }
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey
      );
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts, navigate, showShortcutsHelp, focusSearch, closeModals]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    showShortcutsHelp
  };
}