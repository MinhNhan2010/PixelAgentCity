const fs = require('fs');
const filePath = 'index.html';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// Find the line with "</div>" closing minimap (line index ~296)
// Then keep </section> on the next line
// Then skip everything until we find the REAL "<!-- Right Panel - Agent Management -->" 
// followed by a clean "<section class="management-panel">" (no junk after >)
// followed by "<!-- Panel Header -->" (clean, no junk after >)

const result = [];
let skipMode = false;
let foundGoodSection = false;

for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // After the </section> that closes the office-panel, start looking for junk
    if (i > 290 && !skipMode && !foundGoodSection) {
        // Detect the first junk line after </section>
        if (trimmed === '</section>' && !skipMode) {
            result.push(lines[i]);
            // Check if what follows is junk (orphaned toolbar)
            // Look ahead to see if we have toolbar-btn or tb-icon within next 30 lines
            let hasToolbarJunk = false;
            for (let j = i + 1; j < Math.min(i + 35, lines.length); j++) {
                if (lines[j].includes('toolbar-btn') || lines[j].includes('tb-icon') || lines[j].includes('tb-label')) {
                    hasToolbarJunk = true;
                    break;
                }
            }
            if (hasToolbarJunk) {
                skipMode = true;
                continue;
            }
        }
    }
    
    if (skipMode) {
        // Look for the CLEAN management panel section (has mp-header after it)
        if (trimmed.includes('<!-- Right Panel - Agent Management -->')) {
            // Check if the NEXT non-empty line is a clean section tag
            let nextIdx = i + 1;
            while (nextIdx < lines.length && lines[nextIdx].trim() === '') nextIdx++;
            if (nextIdx < lines.length && lines[nextIdx].trim() === '<section class="management-panel">') {
                // Check one more line
                let nextNext = nextIdx + 1;
                while (nextNext < lines.length && lines[nextNext].trim() === '') nextNext++;
                if (nextNext < lines.length && lines[nextNext].trim() === '<!-- Panel Header -->') {
                    // This is the real one!
                    skipMode = false;
                    foundGoodSection = true;
                    result.push('');
                    result.push(lines[i]); // <!-- Right Panel -->
                    // Continue normally from here
                    continue;
                }
            }
        }
        // Skip this junk line
        continue;
    }
    
    result.push(lines[i]);
}

fs.writeFileSync(filePath, result.join('\r\n'), 'utf8');
console.log(`Done! Removed ${lines.length - result.length} junk lines.`);
console.log(`Original: ${lines.length} lines, New: ${result.length} lines`);
