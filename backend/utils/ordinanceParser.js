/**
 * Ordinance Document Parser
 * Extracts text from PLENRO_ORDINANCE.docx using mammoth
 */

const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

// Cache for document content
let cachedContent = null;
let cachedChunks = null;

/**
 * Get the ordinance document path
 */
function getOrdinancePath() {
    // Go up from backend to project root, then into reference folder
    return path.join(__dirname, '..', '..', 'reference', 'PLENRO_ORDINANCE.docx');
}

/**
 * Extract text content from the PLENRO Ordinance document
 * @returns {Promise<string>} The extracted text content
 */
async function getOrdinanceContent() {
    // Return cached content if available
    if (cachedContent) {
        return cachedContent;
    }

    const docPath = getOrdinancePath();
    
    // Check if file exists
    if (!fs.existsSync(docPath)) {
        throw new Error(`Ordinance document not found at: ${docPath}`);
    }

    try {
        const result = await mammoth.extractRawText({ path: docPath });
        cachedContent = result.value;
        cachedChunks = null;
        
        console.log(`📄 Ordinance document loaded: ${cachedContent.length} characters`);
        
        return cachedContent;
    } catch (error) {
        console.error('❌ Failed to parse ordinance document:', error.message);
        throw new Error('Failed to parse ordinance document: ' + error.message);
    }
}

/**
 * Clear the cached content (useful for reloading)
 */
function clearCache() {
    cachedContent = null;
    cachedChunks = null;
}

/**
 * Check if the ordinance document exists
 * @returns {boolean}
 */
function ordinanceExists() {
    return fs.existsSync(getOrdinancePath());
}

function normalizeText(value) {
    return value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function splitIntoChunks(content, maxChunkLength = 1800) {
    const normalized = normalizeText(content);
    const paragraphs = normalized
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean);

    const chunks = [];
    let current = '';

    for (const paragraph of paragraphs) {
        const next = current ? `${current}\n\n${paragraph}` : paragraph;

        if (next.length <= maxChunkLength) {
            current = next;
            continue;
        }

        if (current) {
            chunks.push(current);
        }

        if (paragraph.length <= maxChunkLength) {
            current = paragraph;
            continue;
        }

        for (let index = 0; index < paragraph.length; index += maxChunkLength) {
            chunks.push(paragraph.slice(index, index + maxChunkLength));
        }
        current = '';
    }

    if (current) {
        chunks.push(current);
    }

    return chunks;
}

async function getOrdinanceChunks() {
    if (cachedChunks) {
        return cachedChunks;
    }

    const content = await getOrdinanceContent();
    cachedChunks = splitIntoChunks(content);
    return cachedChunks;
}

function tokenizeQuery(query) {
    return Array.from(
        new Set(
            query
                .toLowerCase()
                .match(/[a-z0-9]{3,}/g) || []
        )
    );
}

function expandQueryTerms(query) {
    const baseTerms = tokenizeQuery(query);
    const expanded = new Set(baseTerms);
    const synonymGroups = [
        ['penalty', 'penalties', 'fine', 'fines', 'violation', 'violations', 'offense', 'offenses'],
        ['permit', 'permits', 'license', 'licenses', 'clearance', 'clearances'],
        ['requirement', 'requirements', 'required', 'qualification', 'qualifications'],
        ['application', 'apply', 'applicant', 'applicants'],
        ['fee', 'fees', 'payment', 'payments', 'charge', 'charges'],
        ['section', 'sections', 'article', 'articles'],
        ['quarry', 'sand', 'gravel', 'extract', 'extraction'],
    ];

    for (const group of synonymGroups) {
        if (group.some((term) => expanded.has(term))) {
            for (const term of group) {
                expanded.add(term);
            }
        }
    }

    return Array.from(expanded);
}

function collectNeighborIndexes(indexes, total, radius = 1) {
    const selected = new Set();

    for (const index of indexes) {
        for (let offset = -radius; offset <= radius; offset += 1) {
            const nextIndex = index + offset;
            if (nextIndex >= 0 && nextIndex < total) {
                selected.add(nextIndex);
            }
        }
    }

    return Array.from(selected).sort((left, right) => left - right);
}

async function getRelevantOrdinanceContext(query, options = {}) {
    const { maxChunks = 5 } = options;
    const chunks = await getOrdinanceChunks();
    const terms = expandQueryTerms(query);

    if (!terms.length) {
        return chunks.slice(0, maxChunks).join('\n\n---\n\n');
    }

    const scored = chunks
        .map((chunk, index) => {
            const lowerChunk = chunk.toLowerCase();
            let score = 0;

            for (const term of terms) {
                const exactMatches = lowerChunk.match(new RegExp(`\\b${term}\\b`, 'g'));
                if (exactMatches?.length) {
                    score += exactMatches.length * 3;
                    continue;
                }

                if (lowerChunk.includes(term)) {
                    score += 1;
                }
            }

            if (/(section|article)\s+\d+/i.test(chunk)) {
                score += 3;
            }

            if (/section|article|penalt|violat|permit|requirement|applic|fee|quarry/i.test(query) && /(section|article)/i.test(chunk)) {
                score += 2;
            }

            if (/penalt|violat|offen/i.test(query) && /(penalt|violat|fine|offense)/i.test(chunk)) {
                score += 4;
            }

            if (/permit|applic|requirement|license|clearance/i.test(query) && /(permit|applic|requirement|license|clearance)/i.test(chunk)) {
                score += 4;
            }

            return { chunk, index, score };
        })
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .slice(0, Math.max(2, Math.ceil(maxChunks / 2)));

    const selectedIndexes = scored.length
        ? collectNeighborIndexes(
              scored.map((item) => item.index),
              chunks.length,
              1
          ).slice(0, maxChunks)
        : Array.from({ length: Math.min(maxChunks, chunks.length) }, (_, index) => index);
    const selected = selectedIndexes.map((index) => chunks[index]);
    return selected.join('\n\n---\n\n');
}

module.exports = {
    getOrdinanceContent,
    getOrdinanceChunks,
    getRelevantOrdinanceContext,
    clearCache,
    ordinanceExists
};
