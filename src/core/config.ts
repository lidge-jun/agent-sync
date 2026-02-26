/**
 * core/config.ts — Configuration & paths
 */
import { join, resolve } from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export const HOME = os.homedir();
export const AGENT_SYNC_HOME = process.env.AGENT_SYNC_HOME
    ? resolve(process.env.AGENT_SYNC_HOME.replace(/^~(?=\/|$)/, HOME))
    : join(HOME, '.agent-sync');

export const MCP_PATH = join(AGENT_SYNC_HOME, 'mcp.json');
export const SKILLS_DIR = join(AGENT_SYNC_HOME, 'skills');
export const SKILLS_REF_DIR = join(AGENT_SYNC_HOME, 'skills_ref');

export function ensureHome() {
    fs.mkdirSync(AGENT_SYNC_HOME, { recursive: true });
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
}
