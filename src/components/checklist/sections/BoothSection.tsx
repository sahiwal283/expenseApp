import React, { useState } from 'react';
import { Building2, Zap, CheckCircle2, Circle } from 'lucide-react';
import { ChecklistData } from '../TradeShowChecklist';

interface BoothSectionProps {
  checklist: ChecklistData;
  onUpdate: (updates: Partial<ChecklistData>) => Promise<void>;
  saving: boolean;
}

export const BoothSection: React.FC<BoothSectionProps> = ({ checklist, onUpdate, saving }) => {
  const [boothNotes, setBoothNotes] = useState(checklist.booth_notes || '');
  const [electricityNotes, setElectricityNotes] = useState(checklist.electricity_notes || '');

  const handleBoothToggle = async () => {
    await onUpdate({ booth_ordered: !checklist.booth_ordered });
  };

  const handleElectricityToggle = async () => {
    await onUpdate({ electricity_ordered: !checklist.electricity_ordered });
  };

  const handleBoothNotesBlur = async () => {
    if (boothNotes !== checklist.booth_notes) {
      await onUpdate({ booth_notes: boothNotes });
    }
  };

  const handleElectricityNotesBlur = async () => {
    if (electricityNotes !== checklist.electricity_notes) {
      await onUpdate({ electricity_notes: electricityNotes });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-purple-600" />
        Booth & Facilities
      </h3>

      <div className="space-y-4">
        {/* Booth Checkbox */}
        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
          <button
            onClick={handleBoothToggle}
            disabled={saving}
            className="flex items-start gap-3 w-full text-left group"
          >
            {checklist.booth_ordered ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
            ) : (
              <Circle className="w-6 h-6 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${checklist.booth_ordered ? 'text-gray-900' : 'text-gray-700'}`}>
                Booth Space Ordered
              </p>
              <p className="text-sm text-gray-500 mt-1">Reserve exhibition space at the venue</p>
            </div>
          </button>

          <div className="mt-3 ml-9">
            <textarea
              value={boothNotes}
              onChange={(e) => setBoothNotes(e.target.value)}
              onBlur={handleBoothNotesBlur}
              placeholder="Add notes (booth number, size, location, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* Electricity Checkbox */}
        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
          <button
            onClick={handleElectricityToggle}
            disabled={saving}
            className="flex items-start gap-3 w-full text-left group"
          >
            {checklist.electricity_ordered ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 group-hover:scale-110 transition-transform" />
            ) : (
              <Circle className="w-6 h-6 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
            )}
            <div className="flex-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <div>
                <p className={`font-medium ${checklist.electricity_ordered ? 'text-gray-900' : 'text-gray-700'}`}>
                  Electricity Ordered
                </p>
                <p className="text-sm text-gray-500 mt-1">Order power/electrical hookups for the booth</p>
              </div>
            </div>
          </button>

          <div className="mt-3 ml-9">
            <textarea
              value={electricityNotes}
              onChange={(e) => setElectricityNotes(e.target.value)}
              onBlur={handleElectricityNotesBlur}
              placeholder="Add notes (voltage, number of outlets, special requirements, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

