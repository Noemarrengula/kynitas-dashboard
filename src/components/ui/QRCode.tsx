import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface QRCodeProps {
  data: string;
  size?: number;
}

export function QRCode({ data, size = 150 }: QRCodeProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!data) return null;

  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      {!loaded && !errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded text-[10px] text-muted-foreground px-2 text-center">
          QR Code indisponível
        </div>
      ) : (
        <img
          src={apiUrl}
          alt="QR Code"
          className={`rounded ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}
