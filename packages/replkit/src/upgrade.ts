import { spawn } from 'child_process'

export async function installReplkit({ version, homeDirectory }) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('npm', ['-C', homeDirectory, 'i', `@replit/replkit@${version}`], { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Exited with code ${code}`));
      }
    });
  });
}