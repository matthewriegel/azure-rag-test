#!/usr/bin/env node
/**
 * Export Mermaid diagrams from README files to PNG images
 * 
 * Requires: @mermaid-js/mermaid-cli (install with `npm install -g @mermaid-js/mermaid-cli`)
 * 
 * Usage: node scripts/export-mermaid.js
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const outputDir = join(rootDir, 'docs', 'images');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

/**
 * Extract Mermaid diagrams from README
 */
function extractMermaidDiagrams(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const diagrams = [];
  const regex = /```mermaid\n([\s\S]*?)\n```/g;
  let match;
  let index = 0;

  while ((match = regex.exec(content)) !== null) {
    diagrams.push({
      index: index++,
      content: match[1].trim()
    });
  }

  return diagrams;
}

/**
 * Export main architecture diagram from root README
 */
function exportArchitectureDiagram() {
  console.log('Exporting architecture diagram from root README...');
  
  const readmePath = join(rootDir, 'README.md');
  const diagrams = extractMermaidDiagrams(readmePath);
  
  if (diagrams.length === 0) {
    console.log('No Mermaid diagrams found in README.md');
    return;
  }

  // Export first diagram as architecture.png
  const mmdPath = join(outputDir, 'architecture.mmd');
  const pngPath = join(outputDir, 'architecture.png');
  
  writeFileSync(mmdPath, diagrams[0].content);
  
  try {
    execSync(`npx -y @mermaid-js/mermaid-cli mmdc -i ${mmdPath} -o ${pngPath} -b transparent`, {
      stdio: 'inherit'
    });
    console.log(`✓ Exported: ${pngPath}`);
  } catch (error) {
    console.error(`✗ Failed to export diagram: ${error.message}`);
    console.log('Note: Install mermaid-cli globally: npm install -g @mermaid-js/mermaid-cli');
  }
}

// Main execution
console.log('Mermaid Diagram Export Tool\n');
exportArchitectureDiagram();
console.log('\nExport complete!');
