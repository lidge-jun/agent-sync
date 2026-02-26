/**
 * utils/prompt.ts — Interactive stdin prompting
 */
import * as readline from 'node:readline';

export function ask(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

export async function choose(question: string, max: number): Promise<number> {
    while (true) {
        const raw = await ask(`${question} [1-${max}]: `);
        const n = parseInt(raw, 10);
        if (n >= 1 && n <= max) return n;
        console.log(`  Please enter a number between 1 and ${max}.`);
    }
}
