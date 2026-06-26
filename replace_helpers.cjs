const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/([a-zA-Z0-9_\[\]\.\?]+)\.numbers\[0\] \+ \1\.numbers\[1\] \+ \1\.numbers\[2\]/g, 'getDrawSum($1)');
  
  if (content !== newContent) {
    // We need to add the import statement for getDrawSum if it's not already there.
    if (!newContent.includes('getDrawSum')) {
       // but wait, getDrawSum is already in the replaced content! 
       // Check if import is already present
    }
    
    const importMatch = newContent.match(/import \{[^}]*\} from ["']\.\.?\/[^"']*["'];/);
    if (!newContent.includes('import { getDrawSum }')) {
      // Find relative path to helpers.ts
      let relativePath = path.relative(path.dirname(file), './src/utils/helpers.ts');
      relativePath = relativePath.replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      relativePath = relativePath.replace('.ts', '');
      
      const importStmt = `\nimport { getDrawSum } from "${relativePath}";\n`;
      // insert at top of file, after 'use client' or license
      if (newContent.includes('SPDX-License-Identifier')) {
         newContent = newContent.replace(/\*\//, '*/' + importStmt);
      } else {
         newContent = importStmt + newContent;
      }
    }
    
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated ' + file);
  }
});
