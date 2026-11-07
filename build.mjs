import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
for (const file of ['index.html', 'script.js', 'styles.css', 'page2.html', 'usability.js', 'usability.css']) {
  cpSync(file, `dist/${file}`);
}
