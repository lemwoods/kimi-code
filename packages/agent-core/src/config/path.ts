import { mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';

/**
 * Legacy brand data dir used before the lcode rename. Kept as an automatic
 * fallback so existing installs keep their sessions/config without a migration
 * step: when the lcode home does not exist yet but this one does, it wins.
 */
export function legacyBrandHome(osHomeDir = homedir()): string {
  return join(osHomeDir, '.kimi-code');
}

export function resolveKimiHome(homeDir?: string | undefined): string {
  if (homeDir !== undefined) return homeDir;
  const envHome = process.env['LCODE_HOME'] ?? process.env['KIMI_CODE_HOME'];
  if (envHome !== undefined && envHome.length > 0) return envHome;
  const home = join(homedir(), '.lcode');
  if (!existsSync(home) && existsSync(legacyBrandHome())) return legacyBrandHome();
  return home;
}

export function resolveConfigPath(input: {
  readonly homeDir?: string | undefined;
  readonly configPath?: string | undefined;
}): string {
  return input.configPath ?? join(resolveKimiHome(input.homeDir), 'config.toml');
}

export function ensureKimiHome(homeDir: string): void {
  mkdirSync(homeDir, { recursive: true, mode: 0o700 });
}
