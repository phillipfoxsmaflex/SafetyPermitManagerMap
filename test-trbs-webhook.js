// Test script for TRBS webhook data transmission
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load TRBS data structure
function loadTRBSData() {
  try {
    const trbsPath = path.join(__dirname, 'client/src/data/trbs_complete_hazards.json');
    return JSON.parse(fs.readFileSync(trbsPath, 'utf8'));
  } catch (error) {
    console.error('Could not load TRBS data:', error);
    return null;
  }
}

// Test TRBS formatting function
function formatTRBSDataForWebhook(selectedHazards, hazardNotes) {
  const trbsData = loadTRBSData();
  if (!trbsData) return [];

  let hazardNotesObj = {};
  try {
    hazardNotesObj = hazardNotes ? JSON.parse(hazardNotes) : {};
  } catch (error) {
    console.warn('Invalid JSON in hazardNotes:', hazardNotes);
    hazardNotesObj = {};
  }

  const selectedHazardsList = selectedHazards || [];
  const allHazards = [];

  // Process all TRBS categories
  trbsData.categories.forEach((category) => {
    category.hazards.forEach((hazard, hazardIndex) => {
      const hazardId = `${category.id}-${hazardIndex}`;
      const isSelected = selectedHazardsList.includes(hazardId);
      
      allHazards.push({
        hazardId: hazardId,
        hazardDescription: hazard.hazard,
        isSelected: isSelected,
        notes: hazardNotesObj[hazardId] || '',
        category: category.category,
        categoryId: category.id
      });
    });
  });

  return allHazards;
}

// Test with sample data
const testData = {
  selectedHazards: ["1-0", "1-1", "2-0", "3-0", "4-0", "5-0", "6-0", "7-0", "8-0", "9-0", "10-0", "11-0"],
  hazardNotes: JSON.stringify({
    "1-0": "Quetschgefahr durch hydraulische Presse",
    "2-0": "Lichtbogenschweißen erforderlich",
    "3-0": "Ethanol in Tank 3 - ATEX Zone 1",
    "4-0": "Legionellen möglich",
    "5-0": "Tankinhalt explosionsfähig",
    "6-0": "Heißarbeiten über 400°C",
    "7-0": "Lärmbelastung >85 dB",
    "8-0": "Enge Räume - Sauerstoffmangel",
    "9-0": "Schwere Pumpenteile >25kg",
    "10-0": "Zeitdruck durch Produktionsausfall",
    "11-0": "Absturzgefahr 3m Höhe"
  })
};

console.log('=== TRBS Webhook Test ===');
console.log('Testing with', testData.selectedHazards.length, 'selected hazards across all 11 categories');

const formattedData = formatTRBSDataForWebhook(testData.selectedHazards, testData.hazardNotes);

console.log('\n=== Results ===');
console.log('Total hazards processed:', formattedData.length);
console.log('Selected hazards:', formattedData.filter(h => h.isSelected).length);

// Group by category
const categoriesFound = {};
formattedData.forEach(hazard => {
  if (!categoriesFound[hazard.categoryId]) {
    categoriesFound[hazard.categoryId] = {
      name: hazard.category,
      total: 0,
      selected: 0,
      withNotes: 0
    };
  }
  categoriesFound[hazard.categoryId].total++;
  if (hazard.isSelected) categoriesFound[hazard.categoryId].selected++;
  if (hazard.notes) categoriesFound[hazard.categoryId].withNotes++;
});

console.log('\n=== Categories Coverage ===');
Object.entries(categoriesFound).forEach(([id, data]) => {
  console.log(`Category ${id}: ${data.name}`);
  console.log(`  - Total hazards: ${data.total}`);
  console.log(`  - Selected: ${data.selected}`);
  console.log(`  - With notes: ${data.withNotes}`);
});

console.log('\n=== Sample Selected Hazards with Notes ===');
formattedData.filter(h => h.isSelected && h.notes).slice(0, 5).forEach(hazard => {
  console.log(`${hazard.hazardId} (${hazard.category}): ${hazard.hazardDescription}`);
  console.log(`  Note: ${hazard.notes}`);
});