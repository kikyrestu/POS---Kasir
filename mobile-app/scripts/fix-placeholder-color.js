// Surgical codemod: add placeholderTextColor="#94A3B8" to every <TextInput>
// that has a `placeholder` prop but lacks `placeholderTextColor`.
// Locates via AST, inserts ONLY the one attribute at the byte offset right
// after the element name — no full-file reprint (comments/format preserved).
// Usage: node scripts/fix-placeholder-color.js [--apply]
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const COLOR = '#94A3B8';
const APPLY = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));

let totalHits = 0;
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
  });
  const inserts = []; // { offset, line }
  traverse(ast, {
    JSXOpeningElement(path) {
      const n = path.node;
      if (!n.name || n.name.type !== 'JSXIdentifier' || n.name.name !== 'TextInput') return;
      let hasPlaceholder = false;
      let hasColor = false;
      for (const attr of n.attributes) {
        if (attr.type !== 'JSXAttribute' || !attr.name) continue;
        if (attr.name.name === 'placeholder') hasPlaceholder = true;
        if (attr.name.name === 'placeholderTextColor') hasColor = true;
      }
      if (hasPlaceholder && !hasColor) {
        inserts.push({ offset: n.name.end, line: n.loc.start.line });
      }
    },
  });
  if (inserts.length === 0) continue;
  totalHits += inserts.length;
  console.log(`${file}: ${inserts.length} TextInput(s) at lines ${inserts.map((i) => i.line).join(', ')}`);
  if (APPLY) {
    // apply from last offset to first so earlier offsets stay valid
    let out = code;
    inserts
      .sort((a, b) => b.offset - a.offset)
      .forEach(({ offset }) => {
        out = out.slice(0, offset) + ` placeholderTextColor="${COLOR}"` + out.slice(offset);
      });
    fs.writeFileSync(file, out, 'utf8');
  }
}
console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN'}: ${totalHits} insertion(s) across ${files.length} file(s)`);
