const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== '.next') {
        results = results.concat(getFiles(filePath));
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      results.push(filePath);
    }
  });
  return results;
}

const targetDir = path.join(process.cwd(), 'client');
console.log(`🔍 Scanning files in: ${targetDir}`);
if (!fs.existsSync(targetDir)) {
  console.error("Error: 'client' directory not found. Run this in your workspace root.");
  process.exit(1);
}

const files = getFiles(targetDir);
let modifiedCount = 0;

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Skip files that do not reference getConfig
  if (!content.includes('getConfig')) return;

  // 1. Remove the next/config import statement
  content = content.replace(/import\s+getConfig\s+from\s+['"]next\/config['"];?\r?\n?/g, '');

  // 2. Resolve Simple Assignment: const config = getConfig()
  const simpleAssignRegex = /const\s+(\w+)\s*=\s*getConfig\(\);?\r?\n?/g;
  let match;
  while ((match = simpleAssignRegex.exec(content)) !== null) {
    const varName = match[1];
    content = content.replace(match[0], '');
    const pubRegex = new RegExp(`${varName}\\.publicRuntimeConfig\\.(\\w+)`, 'g');
    const srvRegex = new RegExp(`${varName}\\.serverRuntimeConfig\\.(\\w+)`, 'g');
    content = content.replace(pubRegex, 'process.env.NEXT_PUBLIC_$1');
    content = content.replace(srvRegex, 'process.env.$1');
  }

  // 3. Resolve Direct Inline Usage: getConfig().publicRuntimeConfig.VAR
  content = content.replace(/getConfig\(\)\.publicRuntimeConfig\.(\w+)/g, 'process.env.NEXT_PUBLIC_$1');
  content = content.replace(/getConfig\(\)\.serverRuntimeConfig\.(\w+)/g, 'process.env.$1');

  // 4. Resolve Complex/Nested Destructuring
  const destructureRegex = /const\s*\{([\s\S]*?)\}\s*=\s*getConfig\(\);?\r?\n?/g;
  content = content.replace(destructureRegex, (fullMatch, blockContent) => {
    // If it's simple destructuring (no nested properties/colons), remove the line entirely.
    // Downstream sub-properties will be handled by step 5.
    if (!blockContent.includes(':')) {
      return '';
    }

    const replacements = [];

    // Parse nested publicRuntimeConfig block
    const pubMatch = blockContent.match(/publicRuntimeConfig\s*:\s*\{([\s\S]*?)\}/);
    if (pubMatch) {
      const vars = pubMatch[1]
        .split(',')
        .map(v => v.trim())
        .filter(v => v && !v.startsWith('//') && !v.startsWith('/*'));
      
      vars.forEach(v => {
        if (v.includes(':')) {
          const [originalName, aliasName] = v.split(':').map(s => s.trim());
          replacements.push(`const ${aliasName} = process.env.NEXT_PUBLIC_${originalName};`);
        } else {
          replacements.push(`const ${v} = process.env.NEXT_PUBLIC_${v};`);
        }
      });
    }

    // Parse nested serverRuntimeConfig block
    const srvMatch = blockContent.match(/serverRuntimeConfig\s*:\s*\{([\s\S]*?)\}/);
    if (srvMatch) {
      const vars = srvMatch[1]
        .split(',')
        .map(v => v.trim())
        .filter(v => v && !v.startsWith('//') && !v.startsWith('/*'));

      vars.forEach(v => {
        if (v.includes(':')) {
          const [originalName, aliasName] = v.split(':').map(s => s.trim());
          replacements.push(`const ${aliasName} = process.env.${originalName};`);
        } else {
          replacements.push(`const ${v} = process.env.${v};`);
        }
      });
    }

    return replacements.length > 0 ? replacements.join('\n') + '\n' : '';
  });

  // 5. Clean up loose remaining occurrences of public/server config structures
  content = content.replace(/publicRuntimeConfig\.(\w+)/g, 'process.env.NEXT_PUBLIC_$1');
  content = content.replace(/serverRuntimeConfig\.(\w+)/g, 'process.env.$1');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✔ Migrated: ${path.relative(targetDir, file)}`);
    modifiedCount++;
  }
});

console.log(`\n🎉 Done! Fully migrated ${modifiedCount} files in /client.`);