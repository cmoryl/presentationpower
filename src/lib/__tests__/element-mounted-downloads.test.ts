import { afterEach, describe, expect, it, vi } from 'vitest';
import { savePreparedDownload } from '../element-mounted/downloads';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('mounted file save outcomes', () => {
  const file = { filename: 'issued.pdf', data: new Blob(['issued PDF']) };
  it('resolves only after the native writer closes', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { showSaveFilePicker: vi.fn().mockResolvedValue({ createWritable: async () => ({ write, close }) }) });
    await expect(savePreparedDownload(file)).resolves.toBeUndefined();
    expect(write).toHaveBeenCalledWith(file.data);
    expect(close).toHaveBeenCalledOnce();
  });
  it('rejects a native picker cancellation with download_cancelled', async () => {
    vi.stubGlobal('window', { showSaveFilePicker: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
    await expect(savePreparedDownload(file)).rejects.toMatchObject({ code: 'download_cancelled' });
  });
  it('rejects a failed native write with download_failed', async () => {
    const abort = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { showSaveFilePicker: async () => ({ createWritable: async () => ({ write: async () => { throw new Error('Disk full'); }, close: vi.fn(), abort }) }) });
    await expect(savePreparedDownload(file)).rejects.toEqual({ code: 'download_failed', message: 'Disk full' });
    expect(abort).toHaveBeenCalledOnce();
  });
  it('requests the fallback download but rejects unconfirmed success even when click returns normally', async () => {
    vi.useFakeTimers();
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:verification');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await expect(savePreparedDownload(file)).rejects.toMatchObject({ code: 'download_unconfirmed' });
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('issued.pdf');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(revoke).toHaveBeenCalledWith('blob:verification');
  });
});