/**
 * Checklist Auto-Check Service
 * 
 * Automatically marks checklist items as complete when related receipts are uploaded.
 */

import { checklistRepository } from '../database/repositories/ChecklistRepository';
import { Expense } from '../database/repositories/ExpenseRepository';

class ChecklistAutoCheckService {
  /**
   * Auto-check checklist items based on expense receipt upload
   * Called after expense is created or receipt is updated
   * 
   * @param expense - The expense with receipt that was just created/updated
   */
  async autoCheckFromExpense(expense: Expense): Promise<void> {
    // Only auto-check if expense has a receipt
    if (!expense.receipt_url) {
      return;
    }

    try {
      // Get or create checklist for the event
      let checklist = await checklistRepository.findByEventId(expense.event_id);
      
      if (!checklist) {
        // Create checklist if it doesn't exist
        checklist = await checklistRepository.create(expense.event_id);
        console.log(`[ChecklistAutoCheck] Created checklist for event ${expense.event_id}`);
      }

      // Determine which checklist item to check based on category and description
      const category = expense.category || '';
      const description = expense.description?.toLowerCase() || '';

      // 1. Electricity Ordered
      // Category: 'Booth / Marketing / Tools' AND description contains "electricity"
      if (category === 'Booth / Marketing / Tools' && description.includes('electricity')) {
        await this.checkElectricityOrdered(checklist.id);
      }
      // 2. Booth Space Ordered
      // Category: 'Booth / Marketing / Tools' AND description does NOT contain "electricity"
      else if (category === 'Booth / Marketing / Tools' && !description.includes('electricity')) {
        await this.checkBoothOrdered(checklist.id);
      }
      // 3. Booth Shipping
      // Category: 'Shipping Charges'
      else if (category === 'Shipping Charges') {
        await this.checkBoothShipping(checklist.id);
      }
      // 4. Flight Booked
      // Category: 'Travel - Flight' or 'Flights' (legacy)
      else if (category === 'Travel - Flight' || category === 'Flights') {
        await this.checkFlightBooked(checklist.id, expense.user_id);
      }
      // 5. Hotel Booked
      // Category: 'Accommodation - Hotel' or 'Hotels' (legacy)
      else if (category === 'Accommodation - Hotel' || category === 'Hotels') {
        await this.checkHotelBooked(checklist.id, expense.user_id);
      }
    } catch (error: any) {
      // Log error but don't fail the expense creation/update
      console.error('[ChecklistAutoCheck] Error auto-checking checklist:', {
        expenseId: expense.id,
        eventId: expense.event_id,
        category: expense.category,
        error: error.message
      });
    }
  }

  /**
   * Mark electricity as ordered
   */
  private async checkElectricityOrdered(checklistId: number): Promise<void> {
    try {
      await checklistRepository.updateMainFields(checklistId, {
        electricityOrdered: true
      });
      console.log(`[ChecklistAutoCheck] ✓ Electricity marked as ordered for checklist ${checklistId}`);
    } catch (error: any) {
      console.error(`[ChecklistAutoCheck] Failed to check electricity ordered:`, error.message);
      throw error;
    }
  }

  /**
   * Mark booth space as ordered
   */
  private async checkBoothOrdered(checklistId: number): Promise<void> {
    try {
      await checklistRepository.updateMainFields(checklistId, {
        boothOrdered: true
      });
      console.log(`[ChecklistAutoCheck] ✓ Booth space marked as ordered for checklist ${checklistId}`);
    } catch (error: any) {
      console.error(`[ChecklistAutoCheck] Failed to check booth ordered:`, error.message);
      throw error;
    }
  }

  /**
   * Mark booth shipping as shipped
   * Updates the most recent booth shipping entry, or creates one if none exists
   */
  private async checkBoothShipping(checklistId: number): Promise<void> {
    try {
      // Get all booth shipping entries for this checklist
      const shippingEntries = await checklistRepository.getBoothShipping(checklistId);
      
      if (shippingEntries.length > 0) {
        // Update the most recent entry (last one in the array)
        const mostRecent = shippingEntries[shippingEntries.length - 1];
        await checklistRepository.updateBoothShipping(mostRecent.id, {
          shipped: true
        });
        console.log(`[ChecklistAutoCheck] ✓ Booth shipping marked as shipped (entry ${mostRecent.id}) for checklist ${checklistId}`);
      } else {
        // Create a new booth shipping entry if none exists
        await checklistRepository.createBoothShipping({
          checklistId,
          shippingMethod: 'carrier',
          shipped: true
        });
        console.log(`[ChecklistAutoCheck] ✓ Created and marked booth shipping as shipped for checklist ${checklistId}`);
      }
    } catch (error: any) {
      console.error(`[ChecklistAutoCheck] Failed to check booth shipping:`, error.message);
      throw error;
    }
  }

  /**
   * Mark flight as booked for the attendee
   * Matches flight by attendee_id (user_id from expense)
   */
  private async checkFlightBooked(checklistId: number, attendeeId: string): Promise<void> {
    try {
      // Get all flights for this checklist
      const flights = await checklistRepository.getFlights(checklistId);
      
      // Find flight matching the attendee
      const matchingFlight = flights.find(flight => 
        flight.attendee_id === attendeeId
      );
      
      if (matchingFlight) {
        await checklistRepository.updateFlight(matchingFlight.id, {
          booked: true
        });
        console.log(`[ChecklistAutoCheck] ✓ Flight marked as booked (flight ${matchingFlight.id}, attendee ${attendeeId}) for checklist ${checklistId}`);
      } else {
        console.log(`[ChecklistAutoCheck] ⚠️ No matching flight found for attendee ${attendeeId} in checklist ${checklistId}`);
      }
    } catch (error: any) {
      console.error(`[ChecklistAutoCheck] Failed to check flight booked:`, error.message);
      throw error;
    }
  }

  /**
   * Mark hotel as booked for the attendee
   * Matches hotel by attendee_id (user_id from expense)
   */
  private async checkHotelBooked(checklistId: number, attendeeId: string): Promise<void> {
    try {
      // Get all hotels for this checklist
      const hotels = await checklistRepository.getHotels(checklistId);
      
      // Find hotel matching the attendee
      const matchingHotel = hotels.find(hotel => 
        hotel.attendee_id === attendeeId
      );
      
      if (matchingHotel) {
        await checklistRepository.updateHotel(matchingHotel.id, {
          booked: true
        });
        console.log(`[ChecklistAutoCheck] ✓ Hotel marked as booked (hotel ${matchingHotel.id}, attendee ${attendeeId}) for checklist ${checklistId}`);
      } else {
        console.log(`[ChecklistAutoCheck] ⚠️ No matching hotel found for attendee ${attendeeId} in checklist ${checklistId}`);
      }
    } catch (error: any) {
      console.error(`[ChecklistAutoCheck] Failed to check hotel booked:`, error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const checklistAutoCheckService = new ChecklistAutoCheckService();

