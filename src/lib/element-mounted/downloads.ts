export interface PreparedDownload {
  filename: string;
  data: Blob;
}

interface SaveHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort?(): Promise<void> }>;
}

/** Invoke directly from the host Save button to retain browser user activation. */
export async function savePreparedDownload(file: PreparedDownload): Promise<void> {
  const picker = (window as Window & {
    showSaveFilePicker?: (options: { suggestedName: string }) => Promise<SaveHandle>;
  }).showSaveFilePicker;
  try {
    if (picker) {
      const handle = await picker.call(window, { suggestedName: file.filename });
      const writer = await handle.createWritable();
      try {
        await writer.write(file.data);
        await writer.close();
      } catch (error) {
        await writer.abort?.().catch(() => {});
        throw error;
      }
      return;
    }
    const url = URL.createObjectURL(file.data);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      document.body.appendChild(anchor);
      try { anchor.click(); } finally { anchor.remove(); }
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw { code: 'download_cancelled', message: 'Download cancelled' };
    }
    throw { code: 'download_failed', message: error instanceof Error ? error.message : 'Download failed' };
  }
}

export function validateDownload(value: unknown): PreparedDownload {
  if (!value || typeof value !== 'object') throw new Error('Invalid download');
  const file = value as Partial<PreparedDownload>;
  if (typeof file.filename !== 'string' || !file.filename || file.filename.length > 255 || /[\/\\\x00-\x1f]/.test(file.filename) || !(file.data instanceof Blob) || !file.data.size) {
    throw new Error('Invalid download filename or empty file');
  }
  return { filename: file.filename, data: file.data };
}