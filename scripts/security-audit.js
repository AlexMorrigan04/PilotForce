/**
 * Security audit script
 * Scans codebase for common security issues before build/deployment
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

// Security patterns to check for
const securityPatterns = [
  {
    name: 'Hardcoded API Keys',
    regex: /['"](?:api[_-]?key|token|secret|password|auth)['"]\s*[:=]\s*['"][A-Za-z0-9._~+/=-]{8,}['"]/gi,
    severity: 'HIGH',
  },
  {
    name: 'Hardcoded URLs',
    regex: /['"]https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[^"']*)?['"]/g,
    severity: 'MEDIUM',
    exclude: [
      /localhost/,
      /127\.0\.0\.1/,
      /example\.com/,
      /process\.env/,
      /API_CONFIG/,
    ],
  },
  {
    name: 'Insecure localStorage Usage',
    regex: /localStorage\.(get|set)Item\(['"](?:token|auth|jwt|session|password|secret)['"]/gi,
    severity: 'HIGH',
  },
  {
    name: 'Sensitive Information in Console Log',
    regex: /console\.(log|debug|info|error|warn)\([^)]*(?:password|token|secret|auth|key)[^)]*\)/gi,
    severity: 'MEDIUM',
  },
  {
    name: 'Potentially Unsafe eval() Usage',
    regex: /eval\(/g,
    severity: 'CRITICAL',
  },
  {
    name: 'Insecure Direct Object References',
    regex: /params\.(id|user_id|account_id)/gi,
    severity: 'MEDIUM',
  },
  {
    name: 'Missing CSRF Protection',
    regex: /fetch\(['"]https?:\/\/[^'"]+['"]\s*,\s*\{\s*method\s*:\s*(['"]POST['"]|['"]PUT['"]|['"]DELETE['"])/g,
    exclude: [/'X-Requested-With'|'X-CSRF-Token'/],
    severity: 'HIGH',
  },
  {
    name: 'SQL Injection Risk',
    regex: /execute\(\s*['"`]SELECT|UPDATE|INSERT|DELETE.*\$\{/gi,
    severity: 'CRITICAL',
  },
];

// Directories to skip
const excludedDirs = [
  'node_modules',
  'build',
  'dist',
  'coverage',
  '.git',
  '.github',
];

// File extensions to check
const includedExtensions = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.vue',
];

/**
 * Check if a file should be scanned
 * @param {string} filePath 
 * @returns {boolean}
 */
const shouldScanFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return includedExtensions.includes(ext);
};

/**
 * Scan a file for security issues
 * @param {string} filePath
 */
async function scanFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const issues = [];

    securityPatterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      
      if (matches && matches.length > 0) {
        // Check if match is in excluded patterns
        const validMatches = matches.filter(match => {
          if (!pattern.exclude) return true;
          
          if (Array.isArray(pattern.exclude)) {
            return !pattern.exclude.some(exclusion => exclusion.test(match));
          }
          
          return !pattern.exclude.test(match);
        });
        
        if (validMatches.length > 0) {
          issues.push({
            pattern: pattern.name,
            severity: pattern.severity,
            matches: validMatches,
          });
        }
      }
    });

    if (issues.length > 0) {
      console.log(`\n\x1b[33mIssues found in: \x1b[36m${filePath}\x1b[0m`);
      
      issues.forEach(issue => {
        const severityColor = getSeverityColor(issue.severity);
        console.log(`  - \x1b[37m${issue.pattern}\x1b[0m - ${severityColor}${issue.severity}\x1b[0m`);
        // Only show first match as an example
        if (issue.matches.length > 0) {
          console.log(`    Example: \x1b[33m${issue.matches[0].slice(0, 100)}\x1b[0m`);
        }
      });
      
      return issues;
    }
    
    return [];
  } catch (err) {
    console.error(`Error scanning file ${filePath}:`, err.message);
    return [];
  }
}

/**
 * Get color code based on severity
 * @param {string} severity 
 * @returns {string} ANSI color code
 */
function getSeverityColor(severity) {
  switch (severity) {
    case 'CRITICAL': return '\x1b[41m'; // Red background
    case 'HIGH': return '\x1b[31m';     // Red
    case 'MEDIUM': return '\x1b[33m';   // Yellow
    case 'LOW': return '\x1b[32m';      // Green
    default: return '\x1b[37m';         // White
  }
}

/**
 * Scan a directory recursively
 * @param {string} dirPath 
 */
async function scanDirectory(dirPath) {
  try {
    const entries = await readdir(dirPath);
    let allIssues = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        if (!excludedDirs.includes(entry)) {
          const issues = await scanDirectory(fullPath);
          allIssues = allIssues.concat(issues);
        }
      } else if (shouldScanFile(fullPath)) {
        const issues = await scanFile(fullPath);
        allIssues = allIssues.concat(issues);
      }
    }
    
    return allIssues;
  } catch (err) {
    console.error(`Error scanning directory ${dirPath}:`, err.message);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\x1b[36m%s\x1b[0m', '🔒 Running security audit...');
  console.log('\x1b[36m%s\x1b[0m', '----------------------------------------');
  
  const startTime = Date.now();
  const rootDir = path.resolve(__dirname, '..');
  const srcDir = path.join(rootDir, 'src');
  
  try {
    const issues = await scanDirectory(srcDir);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\x1b[36m%s\x1b[0m', '----------------------------------------');
    console.log(`\x1b[36m🔍 Security scan completed in ${duration}s\x1b[0m`);
    
    // Group issues by severity
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = issues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = issues.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = issues.filter(i => i.severity === 'LOW').length;
    
    if (issues.length > 0) {
      console.log('\n\x1b[33mSecurity Issues Summary:\x1b[0m');
      console.log(`  - Critical: ${criticalIssues}`);
      console.log(`  - High:     ${highIssues}`);
      console.log(`  - Medium:   ${mediumIssues}`);
      console.log(`  - Low:      ${lowIssues}`);
      
      // Exit with error if critical or high issues are found
      if (criticalIssues > 0 || highIssues > 0) {
        console.log('\n\x1b[31m❌ Security audit failed! Please fix the critical and high issues before proceeding.\x1b[0m');
        process.exit(1);
      } else {
        console.log('\n\x1b[33m⚠️  Security audit completed with warnings. Consider addressing medium/low issues.\x1b[0m');
        process.exit(0);
      }
    } else {
      console.log('\n\x1b[32m✅ No security issues found!\x1b[0m');
      process.exit(0);
    }
  } catch (err) {
    console.error('\x1b[31mError running security audit:\x1b[0m', err);
    process.exit(1);
  }
}

// Run the main function
main();
