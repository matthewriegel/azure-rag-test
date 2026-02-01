#!/usr/bin/env node
/**
 * Verify curl examples from README files
 * 
 * Extracts fenced curl snippets from README files and executes them
 * against a local dev server to verify they work correctly.
 * 
 * Usage: node scripts/verify-curl-examples.js
 * 
 * Prerequisites: Server must be running on localhost:3000
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

/**
 * Extract curl commands from README
 */
function extractCurlCommands(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const curls = [];
  const regex = /```(?:bash|shell)\n(curl\s+[\s\S]*?)\n```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const curlCmd = match[1].trim();
    if (curlCmd.startsWith('curl')) {
      curls.push({
        file: filePath,
        command: curlCmd
      });
    }
  }

  return curls;
}

/**
 * Execute curl command and validate response
 */
function verifyCurlCommand(curlObj) {
  const { file, command } = curlObj;
  
  // Replace localhost:3000 with SERVER_URL
  const cmd = command.replace(/http:\/\/localhost:3000/g, SERVER_URL);
  
  console.log(`\nTesting: ${file}`);
  console.log(`Command: ${cmd.substring(0, 80)}...`);
  
  try {
    const output = execSync(`${cmd} -s -w "\\nHTTP_CODE:%{http_code}"`, {
      encoding: 'utf-8',
      timeout: 10000
    });
    
    // Extract HTTP status code
    const match = output.match(/HTTP_CODE:(\d+)/);
    const statusCode = match ? parseInt(match[1]) : 0;
    const response = output.replace(/HTTP_CODE:\d+/, '').trim();
    
    // Validate status code
    if (statusCode >= 200 && statusCode < 300) {
      console.log(`✓ Status: ${statusCode}`);
      
      // Validate JSON structure
      if (response) {
        try {
          const json = JSON.parse(response);
          console.log(`✓ Valid JSON response`);
          
          // Check for expected fields
          if (json.success !== undefined || json.status !== undefined) {
            console.log(`✓ Response structure valid`);
          }
        } catch (e) {
          console.log(`⚠ Non-JSON response (may be expected)`);
        }
      }
    } else if (statusCode === 401 || statusCode === 429) {
      console.log(`⚠ Status: ${statusCode} (expected for protected endpoints)`);
    } else {
      console.log(`✗ Status: ${statusCode}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
    return false;
  }
}

/**
 * Main verification
 */
async function main() {
  console.log('cURL Example Verification Tool\n');
  console.log(`Server URL: ${SERVER_URL}\n`);
  
  // Find all README files
  const readmeFiles = glob.sync('**/README.md', {
    cwd: rootDir,
    ignore: ['node_modules/**', 'dist/**']
  });
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const file of readmeFiles) {
    const filePath = join(rootDir, file);
    const curlCommands = extractCurlCommands(filePath);
    
    for (const curlObj of curlCommands) {
      totalTests++;
      if (verifyCurlCommand(curlObj)) {
        passedTests++;
      }
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests < totalTests) {
    console.log('\nNote: Some failures may be expected (e.g., auth required, server not running)');
    process.exit(1);
  }
}

main().catch(console.error);
