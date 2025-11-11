/**
 * Checklist Utility Functions
 * 
 * Extracted complex checklist-related logic
 */

import { ChecklistData } from '../components/checklist/TradeShowChecklist';

export interface ChecklistSection {
  key: string;
  isComplete: boolean;
  component: React.ReactNode;
}

/**
 * Checks if a checklist section has items
 */
export function sectionHasItems(sectionKey: string, checklist: ChecklistData): boolean {
  switch (sectionKey) {
    case 'booth':
      return true; // Always show booth
    case 'flights':
      return checklist.flights.length > 0;
    case 'hotels':
      return checklist.hotels.length > 0;
    case 'car_rentals':
      return checklist.carRentals.length > 0;
    case 'custom':
      return checklist.customItems.length > 0;
    default:
      return true;
  }
}

/**
 * Sorts checklist sections: incomplete with items first, completed next, empty last
 */
export function sortChecklistSections(sections: ChecklistSection[]): ChecklistSection[] {
  return sections.sort((a, b) => {
    const aHasItems = sectionHasItems(a.key, {} as ChecklistData); // Will be passed from context
    const bHasItems = sectionHasItems(b.key, {} as ChecklistData);

    // Empty sections go to bottom
    if (!aHasItems && bHasItems) return 1;
    if (aHasItems && !bHasItems) return -1;
    if (!aHasItems && !bHasItems) return 0;

    // Among sections with items: incomplete first, completed last
    if (a.isComplete === b.isComplete) return 0;
    return a.isComplete ? 1 : -1;
  });
}

/**
 * Sorts checklist sections with checklist context
 */
export function sortChecklistSectionsWithContext(
  sections: ChecklistSection[],
  checklist: ChecklistData
): ChecklistSection[] {
  return sections.sort((a, b) => {
    const aHasItems = sectionHasItems(a.key, checklist);
    const bHasItems = sectionHasItems(b.key, checklist);

    // Empty sections go to bottom
    if (!aHasItems && bHasItems) return 1;
    if (aHasItems && !bHasItems) return -1;
    if (!aHasItems && !bHasItems) return 0;

    // Among sections with items: incomplete first, completed last
    if (a.isComplete === b.isComplete) return 0;
    return a.isComplete ? 1 : -1;
  });
}

