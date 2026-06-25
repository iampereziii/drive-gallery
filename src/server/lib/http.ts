import fs from 'node:fs';
import type { Response } from 'express';

/** Standard error envelope: { error: { code, message } }. */
export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

/** True if the browse root is currently reachable (drive plugged in). */
export function driveAvailable(root: string): boolean {
  try {
    return fs.statSync(root).isDirectory();
  } catch {
    return false;
  }
}
