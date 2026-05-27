const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function base64ToUint8Array(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function isZipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function bytesFromUnknownBinary(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof Blob) {
    return null;
  }
  if (typeof data !== 'string' || !data.length) {
    return null;
  }

  const trimmed = data.trim();

  if (trimmed.startsWith('UEs') || /^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    try {
      return base64ToUint8Array(trimmed);
    } catch {
      // not base64
    }
  }

  if (trimmed.startsWith('PK')) {
    const bytes = new Uint8Array(trimmed.length);
    for (let i = 0; i < trimmed.length; i++) {
      bytes[i] = trimmed.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  return null;
}

export function blobFromBinaryData(
  data: unknown,
  mime = XLSX_MIME
): Blob {
  if (data instanceof Blob) {
    return data;
  }

  const bytes = bytesFromUnknownBinary(data);
  if (bytes) {
    return new Blob([Uint8Array.from(bytes)], { type: mime });
  }

  if (typeof data === 'string') {
    return new Blob([data], { type: mime });
  }

  return new Blob([JSON.stringify(data ?? '')], {
    type: 'application/octet-stream',
  });
}

export async function assertValidXlsxBlob(blob: Blob): Promise<Blob> {
  if (blob.size === 0) {
    throw new Error('Excel faylı boş gəldi (0 байт).');
  }

  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (isZipBytes(header)) {
    return blob;
  }

  const text = await blob.text();
  try {
    const json = JSON.parse(text) as { error?: string };
    if (json?.error) {
      throw new Error(json.error);
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      // not JSON — fall through
    } else if (err instanceof Error) {
      throw err;
    }
  }

  throw new Error(
    'Server etibarsız fayl qaytardı (Excel formatı deyil). Token və ya export endpoint yoxlanılsın.'
  );
}
