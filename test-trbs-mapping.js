// Test script to verify TRBS hazard mapping parsing
const testCases = [
  {
    input: "1-0, 7-1, 8-0, 4-0",
    expected: ["1-0", "7-1", "8-0", "4-0"],
    description: "Comma-separated with spaces"
  },
  {
    input: "1-0,7-1,8-0,4-0",
    expected: ["1-0", "7-1", "8-0", "4-0"],
    description: "Comma-separated without spaces"
  },
  {
    input: ["1-0", "7-1", "8-0", "4-0"],
    expected: ["1-0", "7-1", "8-0", "4-0"],
    description: "Already an array"
  },
  {
    input: '["1-0", "7-1", "8-0", "4-0"]',
    expected: ["1-0", "7-1", "8-0", "4-0"],
    description: "JSON string array"
  }
];

function sanitizeSuggestionValue(fieldName, suggestedValue) {
  try {
    switch (fieldName) {
      case 'selectedHazards':
      case 'completedMeasures':
        if (Array.isArray(suggestedValue)) {
          return suggestedValue;
        } else if (typeof suggestedValue === 'string') {
          // Handle comma-separated string format like "1-0, 7-1, 8-0, 4-0"
          if (suggestedValue.includes(',')) {
            return suggestedValue.split(',').map(s => s.trim()).filter(s => s);
          }
          // Try to parse as JSON array first
          try {
            const parsed = JSON.parse(suggestedValue);
            return Array.isArray(parsed) ? parsed : [suggestedValue.trim()];
          } catch {
            // Single value or space-separated values
            return suggestedValue.split(/[,\s]+/).map(s => s.trim()).filter(s => s);
          }
        }
        return [];
      default:
        return String(suggestedValue);
    }
  } catch (error) {
    console.error(`Error sanitizing value for ${fieldName}:`, error);
    return null;
  }
}

console.log('Testing TRBS hazard parsing logic:');
testCases.forEach((test, index) => {
  const result = sanitizeSuggestionValue('selectedHazards', test.input);
  const passed = JSON.stringify(result) === JSON.stringify(test.expected);
  console.log(`Test ${index + 1} (${test.description}): ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`  Input: ${JSON.stringify(test.input)}`);
  console.log(`  Expected: ${JSON.stringify(test.expected)}`);
  console.log(`  Got: ${JSON.stringify(result)}`);
  console.log('');
});