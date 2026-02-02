import readline from 'readline';

// ============================================================================
// COLORS
// ============================================================================

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

export const colors = {
  reset: RESET,
  bold: (text: string) => `${ESC}1m${text}${RESET}`,
  dim: (text: string) => `${ESC}2m${text}${RESET}`,
  red: (text: string) => `${ESC}31m${text}${RESET}`,
  green: (text: string) => `${ESC}32m${text}${RESET}`,
  yellow: (text: string) => `${ESC}33m${text}${RESET}`,
  blue: (text: string) => `${ESC}34m${text}${RESET}`,
  cyan: (text: string) => `${ESC}36m${text}${RESET}`,
};

// ============================================================================
// PROMPTS
// ============================================================================

export interface Choice {
  title: string;
  value: any;
}

/**
 * Basic confirmation prompt (Yes/No)
 */
export function confirm(message: string, initial: boolean = true): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const defaultText = initial ? 'Y/n' : 'y/N';
    const query = `${colors.bold(message)} ${colors.dim(`(${defaultText})`)} `;

    rl.question(query, answer => {
      rl.close();
      const input = answer.trim().toLowerCase();
      if (input === '') {
        resolve(initial);
      } else {
        resolve(input === 'y' || input === 'yes');
      }
    });
  });
}

/**
 * Selection prompt
 * A simple implementation that lists options and asks user to type the number.
 * Implementing a full arrow-key menu without deps is complex; this is a robust fallback.
 */
export function select<T>(message: string, choices: Choice[]): Promise<T> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(colors.bold(message));
    choices.forEach((choice, index) => {
      console.log(`  ${colors.cyan(`${index + 1})`)} ${choice.title}`);
    });

    const ask = () => {
      rl.question(`\n${colors.bold('Select an option (1-' + choices.length + '):')} `, answer => {
        const num = parseInt(answer.trim(), 10);
        if (!isNaN(num) && num >= 1 && num <= choices.length) {
          rl.close();
          resolve(choices[num - 1].value);
        } else {
          console.log(colors.red('Invalid selection. Please try again.'));
          ask();
        }
      });
    };

    ask();
  });
}
