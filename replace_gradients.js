const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function replaceGradients(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceGradients(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;

      content = content.replace(/bg-gradient-to-r from-gradient-start to-gradient-end/g, 'bg-primary');
      content = content.replace(/bg-gradient-to-br from-gradient-start to-gradient-end/g, 'bg-primary');
      content = content.replace(/bg-gradient-to-br from-primary-light to-surface/g, 'bg-surface');
      content = content.replace(/from-gradient-start to-gradient-end bg-clip-text text-transparent/g, 'text-primary');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceGradients(srcDir);
console.log("Done");
