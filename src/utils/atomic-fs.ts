import fs from 'fs';
import path from 'path';

export interface AtomicWriteOptions extends fs.WriteFileOptions {
    mode?: fs.Mode;
}

/**
 * Writes content to a file atomically by writing to a temporary file first
 * and then renaming it.
 *
 * IMPORTANT: This function preserves the existing file's permissions (mode)
 * if it exists. If the file is new and looks sensitive (e.g. .env),
 * it defaults to 0o600.
 */
export function writeFileSyncAtomic(
    filePath: string,
    content: string | NodeJS.ArrayBufferView,
    options: AtomicWriteOptions = {}
): void {
    const tempPath = `${filePath}.tmp`;
    let mode = options.mode;

    // 1. Determine target mode
    if (mode === undefined) {
        try {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                mode = stats.mode;
            } else {
                // If it's a new file, check if it's sensitive
                const fileName = path.basename(filePath);
                if (/^\.env(\.|$)/.test(fileName) && fileName !== '.env.example') {
                    mode = 0o600;
                }
            }
        } catch (err) {
            // Ignore stat errors, fallback to default (undefined means use default/umask)
        }
    }

    try {
        // 2. Write to temp file with correct mode
        // Note: fs.writeFileSync options.mode is the *permissions* (default 0o666)
        // If we want specific permissions, we should pass them here.
        // However, node's writeFileSync 'mode' option works on creation.

        const writeOptions: fs.WriteFileOptions = {
            ...options,
            mode: mode // This sets permissions for the new temp file
        };

        fs.writeFileSync(tempPath, content, writeOptions);

        // Double check permissions if mode was specified (sometimes OS/umask interferes)
        // But for atomic replace, the most important thing is that the temp file
        // has the correct permissions BEFORE it becomes the real file.
        if (mode !== undefined && process.platform !== 'win32') {
             try {
                 fs.chmodSync(tempPath, mode);
             } catch (e) {
                 // Ignore chmod errors (e.g. ownership issues)
             }
        }

        // 3. Rename temp to target (Atomic replacement)
        fs.renameSync(tempPath, filePath);

    } catch (err) {
        // Cleanup temp file on error
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (e) { /* ignore */ }
        }
        throw err;
    }
}
