import React, { useState } from 'react';
import { Package, CheckCircle2, Circle, Save } from 'lucide-react';
import { ChecklistData, BoothShippingData } from '../TradeShowChecklist';

interface BoothShippingSectionProps {
  checklist: ChecklistData;
  onReload: () => void;
}

export const BoothShippingSection: React.FC<BoothShippingSectionProps> = ({ checklist, onReload }) => {
  const existing = checklist.boothShipping.length > 0 ? checklist.boothShipping[0] : null;
  
  const [shippingData, setShippingData] = useState<BoothShippingData>(existing || {
    shipping_method: 'carrier',
    carrier_name: null,
    tracking_number: null,
    shipping_date: null,
    delivery_date: null,
    notes: null,
    shipped: false
  });

  const [isModified, setIsModified] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field: keyof BoothShippingData, value: any) => {
    setShippingData({ ...shippingData, [field]: value });
    setIsModified(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/${checklist.id}/booth-shipping`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shippingMethod: shippingData.shipping_method,
            carrierName: shippingData.carrier_name,
            trackingNumber: shippingData.tracking_number,
            shippingDate: shippingData.shipping_date,
            deliveryDate: shippingData.delivery_date,
            notes: shippingData.notes,
            shipped: shippingData.shipped
          })
        }
      );

      setIsModified(false);
      onReload();
    } catch (error) {
      console.error('[BoothShippingSection] Error saving shipping:', error);
      alert('Failed to save booth shipping information');
    } finally {
      setSaving(false);
    }
  };

  const toggleShipped = async () => {
    if (!existing) return;

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/checklist/${checklist.id}/booth-shipping`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            shippingMethod: existing.shipping_method,
            carrierName: existing.carrier_name,
            trackingNumber: existing.tracking_number,
            shippingDate: existing.shipping_date,
            deliveryDate: existing.delivery_date,
            notes: existing.notes,
            shipped: !existing.shipped
          })
        }
      );
      onReload();
    } catch (error) {
      console.error('[BoothShippingSection] Error toggling shipped:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          Booth Shipping
        </h3>
        
        {isModified && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={toggleShipped}
            disabled={!existing}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existing?.shipped ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 hover:scale-110 transition-transform" />
            ) : (
              <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" />
            )}
          </button>
          <div>
            <p className="font-medium text-gray-900">Booth Shipped</p>
            <p className="text-xs text-gray-500">Mark as shipped when booth materials are sent</p>
          </div>
        </div>

        {/* Shipping Method Radio */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Shipping Method
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="carrier"
                checked={shippingData.shipping_method === 'carrier'}
                onChange={(e) => handleFieldChange('shipping_method', e.target.value)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Carrier Shipping</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="manual"
                checked={shippingData.shipping_method === 'manual'}
                onChange={(e) => handleFieldChange('shipping_method', e.target.value)}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Manual Delivery</span>
            </label>
          </div>
        </div>

        {/* Carrier Fields (only show if carrier method) */}
        {shippingData.shipping_method === 'carrier' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Carrier Name
              </label>
              <input
                type="text"
                value={shippingData.carrier_name || ''}
                onChange={(e) => handleFieldChange('carrier_name', e.target.value)}
                placeholder="e.g., FedEx, UPS"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tracking Number
              </label>
              <input
                type="text"
                value={shippingData.tracking_number || ''}
                onChange={(e) => handleFieldChange('tracking_number', e.target.value)}
                placeholder="Tracking/shipment number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}

        {/* Date Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {shippingData.shipping_method === 'carrier' ? 'Shipping Date' : 'Departure Date'}
            </label>
            <input
              type="date"
              value={shippingData.shipping_date || ''}
              onChange={(e) => handleFieldChange('shipping_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {shippingData.shipping_method === 'carrier' ? 'Expected Delivery' : 'Arrival Date'}
            </label>
            <input
              type="date"
              value={shippingData.delivery_date || ''}
              onChange={(e) => handleFieldChange('delivery_date', e.target.value)}
              min={shippingData.shipping_date || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={shippingData.notes || ''}
            onChange={(e) => handleFieldChange('notes', e.target.value)}
            placeholder={
              shippingData.shipping_method === 'carrier'
                ? 'Shipment details, special instructions, contact info, etc.'
                : 'Who is transporting, vehicle info, route details, etc.'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

