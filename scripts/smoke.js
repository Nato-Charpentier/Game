const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
}

function assertContains(content, token, context, issues) {
  if (!content.includes(token)) {
    issues.push(`${context} manque "${token}"`);
  }
}

function checkHtml(ids, issues) {
  const html = read('index.html');
  ids.forEach((id) => assertContains(html, `id="${id}"`, 'index.html', issues));
  assertContains(html, '<canvas id="game">', 'index.html', issues);
}

function checkJs(tokens, issues) {
  const js = read('src/main.js');
  tokens.forEach((token) => assertContains(js, token, 'src/main.js', issues));
}

function main() {
  const issues = [];
  checkHtml(['hud', 'health', 'tip', 'objective', 'score', 'staminaFill', 'staminaBar'], issues);
  checkJs(
    [
      'const staminaMax',
      "keys.get('KeyZ')",
      "keys.get('KeyQ')",
      'updateShieldEffect',
      'createSpecters',
      'player.shield',
      'staminaFill.style.width',
    ],
    issues
  );

  if (issues.length > 0) {
    console.error('Échec du smoke test :');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  console.log('Smoke test réussi : HUD et mécaniques clés détectés.');
}

main();
