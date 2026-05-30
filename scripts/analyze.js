/**
 * @file overview.js
 * @description
 * Auxiliary script to aggregate statistics about the project.
 * This does not run as part of the core React application.
 */

const fs = require('fs');
const path = require('path');

function countFilesByExtension(dir, ext, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        countFilesByExtension(filePath, ext, fileList);
      }
    } else {
      if (filePath.endsWith(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

if (require.main === module) {
  console.log("Analyzing project structure...");
  const tsFiles = countFilesByExtension(path.join(__dirname, '..'), '.ts');
  const tsxFiles = countFilesByExtension(path.join(__dirname, '..'), '.tsx');

  console.log(`Found ${tsFiles.length} TypeScript files.`);
  console.log(`Found ${tsxFiles.length} TSX components.`);
  console.log("Analysis complete.");
}
