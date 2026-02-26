/**
 * utils/log.ts — Colored console output
 */

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';

export const log = {
    info: (msg: string) => console.log(`${CYAN}ℹ${RESET} ${msg}`),
    ok: (msg: string) => console.log(`${GREEN}✔${RESET} ${msg}`),
    warn: (msg: string) => console.log(`${YELLOW}⚠${RESET} ${msg}`),
    err: (msg: string) => console.error(`${RED}✖${RESET} ${msg}`),
    step: (n: number, total: number, msg: string) =>
        console.log(`${DIM}[${n}/${total}]${RESET} ${msg}`),
    header: (msg: string) => console.log(`\n${BOLD}${BLUE}▸ ${msg}${RESET}`),
    dim: (msg: string) => console.log(`  ${DIM}${msg}${RESET}`),
    choice: (n: number, label: string, detail?: string) =>
        console.log(`  ${MAGENTA}${n})${RESET} ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`),
};
