import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useDatabase } from '@/hooks/useDatabase';
import { useBusiness } from '@/contexts/BusinessContext';
import { uploadProductImage } from '@/lib/productImage';
import { toast } from '@/hooks/use-toast';

interface ProductPhotoDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductPhotoDialog({ open, onClose, product }: ProductPhotoDialogProps) {
  const { updateProduct } = useDatabase();
  const { currentBusiness } = useBusiness();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPreview(product?.image || '');
      setFile(null);
    }
  }, [open, product]);

  const handleFile = async (selected: File | undefined) => {
    if (!selected || !product) return;
    if (!selected.type.startsWith('image/')) {
      toast({ title: 'Ficheiro inválido', description: 'Selecione uma imagem (JPG, PNG, etc.)', variant: 'destructive' });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast({ title: 'Imagem demasiado grande', description: 'Máximo 10 MB', variant: 'destructive' });
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler ficheiro'));
        reader.readAsDataURL(selected);
      });
      setFile(selected);
      setPreview(dataUrl);
    } catch {
      toast({ title: 'Erro ao carregar imagem', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!product || !file) return;
    setSaving(true);
    try {
      const imageUrl = await uploadProductImage(file, currentBusiness?.id ?? '', product.id);
      const result = await updateProduct(product.id, { image: imageUrl });
      if (result?.error) {
        toast({ title: 'Erro ao guardar foto', description: result.error.message || 'Tente novamente', variant: 'destructive' });
      } else {
        toast({ title: 'Foto atualizada', description: `${product.name}` });
        onClose();
      }
    } catch (err) {
      toast({ title: 'Erro ao guardar foto', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!product) return;
    setSaving(true);
    try {
      await updateProduct(product.id, { image: undefined });
      setPreview('');
      toast({ title: 'Foto removida', description: `${product.name}` });
      onClose();
    } catch (err) {
      toast({ title: 'Erro ao remover foto', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Foto — {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-40 w-40 rounded-xl border-2 border-dashed bg-muted/30 flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt={product?.name} className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground opacity-50" />
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            <Upload className="h-4 w-4 mr-2" />
            Escolher imagem do dispositivo
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            {product?.image && (
              <Button variant="outline" className="text-destructive" onClick={handleRemove} disabled={saving}>
                Remover
              </Button>
            )}
            <Button className="flex-1" onClick={handleSave} disabled={saving || !file}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
