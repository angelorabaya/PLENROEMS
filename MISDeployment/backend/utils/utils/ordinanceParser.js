/**
 * Ordinance Document Parser
 * Extracts text from PLENRO_ORDINANCE.docx using mammoth
 */

const mammoth = require('mammoth');
const path = require('path');
const fs = require('fs');

// Cache for document content
let cachedContent = null;

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
}

/**
 * Check if the ordinance document exists
 * @returns {boolean}
 */
function ordinanceExists() {
    return fs.existsSync(getOrdinancePath());
}

module.exports = {
    getOrdinanceContent,
    clearCache,
    ordinanceExists
};
