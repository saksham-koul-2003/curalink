// Helper functions for MySQL JSON operations

/**
 * Check if JSON array contains any of the values
 * MySQL equivalent of PostgreSQL's && operator for arrays
 * Returns SQL condition string that can be used in WHERE clause
 */
function jsonContainsAny(jsonColumn, values) {
  if (!values || values.length === 0) return '1=0';
  
  const conditions = values.map((val) => {
    // Escape single quotes and wrap value in quotes for JSON string
    const escapedVal = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `JSON_CONTAINS(${jsonColumn}, JSON_QUOTE('${escapedVal}'))`;
  }).join(' OR ');
  
  return `(${conditions})`;
}

/**
 * Check if JSON array contains value (case-insensitive search)
 */
function jsonContainsCaseInsensitive(jsonColumn, searchTerm) {
  return `JSON_SEARCH(LOWER(${jsonColumn}), 'one', LOWER('%${searchTerm.replace(/'/g, "\\'")}%')) IS NOT NULL`;
}

/**
 * Extract array for LIKE search (for title/description matching)
 */
function jsonArrayForLike(jsonColumn) {
  return `JSON_UNQUOTE(JSON_EXTRACT(${jsonColumn}, '$[*]'))`;
}

/**
 * Parse JSON fields in a row/array of rows
 */
function parseJsonFields(rows, jsonFields = []) {
  if (!rows) return rows;
  
  const parseRow = (row) => {
    if (!row) return row;
    const parsed = { ...row };
    jsonFields.forEach(field => {
      if (parsed[field]) {
        try {
          parsed[field] = typeof parsed[field] === 'string' 
            ? JSON.parse(parsed[field]) 
            : parsed[field];
        } catch (e) {
          // If parsing fails, keep original value
        }
      }
    });
    return parsed;
  };
  
  return Array.isArray(rows) ? rows.map(parseRow) : parseRow(rows);
}

module.exports = {
  jsonContainsAny,
  jsonContainsCaseInsensitive,
  jsonArrayForLike,
  parseJsonFields,
};

