import fs from 'fs';
import path from 'path';

export interface AtomicWriteOptions {
  mode?: number;
  encoding?: BufferEncoding | null;
}

/**
 * Write to a file atomically by writing to a temporary file and renaming it.
 * @param filePath The destination file path
 * @param content The content to write (string or Buffer)
 * @param options Write options (mode, encoding)
 */
export function writeAtomic(
  filePath: string,
  content: string | NodeJS.ArrayBufferView,
  options: AtomicWriteOptions = {}
): void {
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const tempPath = path.join(dir, `.${fileName}.${Date.now()}.tmp`);
  const { mode, encoding = 'utf-8' } = options;
  let tempCreated = false;

  try {
    if (typeof content === 'string') {
      fs.writeFileSync(tempPath, content, { encoding: encoding as BufferEncoding, mode });
    } else {
      fs.writeFileSync(tempPath, content, { mode });
    }
    tempCreated = true;

    try {
      fs.renameSync(tempPath, filePath);
    } catch (renameError: any) {
      if (process.platform === 'win32' && renameError.code === 'EPERM') {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        try {
          fs.renameSync(tempPath, filePath);
        } catch (retryError) {
          // If retry fails, DO NOT delete temp file if we successfully unlinked target
          // But determining if we unlinked target is hard if we don't track it.
          // Actually, if we unlinked target, it's gone. If rename fails, we have temp.
          // We should NOT throw to the outer catch that deletes temp.
          tempCreated = false; // Prevent cleanup
          throw retryError;
        }
      } else {
        throw renameError;
      }
    }
  } catch (error) {
    if (tempCreated) {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch {}
    }
    throw error;
  }
}
