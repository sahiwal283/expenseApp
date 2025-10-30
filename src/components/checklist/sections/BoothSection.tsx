import React, { useState, useRef, useEffect } from 'react';
import { Building2, Zap, CheckCircle2, Circle, Package, Save, Receipt, Upload, X, FileImage, Map, Eye } from 'lucide-react';
import { ChecklistData, BoothShippingData } from '../TradeShowChecklist';
import { api } from '../../../utils/api';
import { User, TradeShow } from '../../../App';
import { ChecklistReceiptUpload } from '../ChecklistReceiptUpload';

interface BoothSectionProps {
  checklist: ChecklistData;
  user: User;
  event: TradeShow;
  onUpdate: (updates: Partial<ChecklistData>) => Promise<void>;
  onReload: () => void;
  saving: boolean;
}

interface ReceiptStatus {
  booth: any[];
  electricity: any[];
  booth_shipping: any[];
}

export const BoothSection: React.FC<BoothSectionProps> = ({ checklist, user, event, onUpdate, onReload, saving }) => {
  const [boothNotes, setBoothNotes] = useState(checklist.booth_notes || '');
  const [electricityNotes, setElectricityNotes] = useState(checklist.electricity_notes || '');
  const [showReceiptUpload, setShowReceiptUpload] = useState<'booth' | 'electricity' | 'booth_shipping' | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>({
    booth: [],
    electricity: [],
    booth_shipping: []
  });
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const boothMapInputRef = useRef<HTMLInputElement>(null);
  
  // Booth shipping state
  const existingShipping = checklist.boothShipping.length > 0 ? checklist.boothShipping[0] : null;
  const [shippingData, setShippingData] = useState<BoothShippingData>(existingShipping || {
    shipping_method: 'carrier',
    carrier_name: null,
    tracking_number: null,
    shipping_date: null,
    delivery_date: null,
    notes: null,
    shipped: false
  });
  const [isShippingModified, setIsShippingModified] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);

  // Load receipts for this event
  // Load receipts for this event
  const loadReceipts = async () => {
    try {
      setLoadingReceipts(true);
      const expenses = await api.getExpenses({ event_id: event.id });
      
      // Categorize expenses by checklist section
      const categorizedReceipts: ReceiptStatus = {
        booth: expenses.filter((e: any) => e.category === 'Booth / Marketing / Tools'),
        electricity: expenses.filter((e: any) => e.category === 'Utilities'),
        booth_shipping: expenses.filter((e: any) => e.category === 'Shipping Charges')
      };
      
      setReceiptStatus(categorizedReceipts);
    } catch (error) {
      console.error('[BoothSection] Error loading receipts:', error);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [event.id]);

  const handleReceiptCreated = () => {
    setShowReceiptUpload(null);
    onReload();
    loadReceipts(); // Reload receipt status
  };

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

  const handleBoothMapUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload an image file (JPEG, PNG, GIF) or PDF');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingMap(true);
    try {
      await api.checklist.uploadBoothMap(checklist.id, file);
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error uploading booth map:', error);
      alert('Failed to upload booth map');
    } finally {
      setUploadingMap(false);
      if (boothMapInputRef.current) {
        boothMapInputRef.current.value = '';
      }
    }
  };

  const handleDeleteBoothMap = async () => {
    if (!confirm('Are you sure you want to delete the booth map?')) return;

    try {
      await api.checklist.deleteBoothMap(checklist.id);
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error deleting booth map:', error);
      alert('Failed to delete booth map');
    }
  };

  const handleShippingFieldChange = (field: keyof BoothShippingData, value: any) => {
    setShippingData({ ...shippingData, [field]: value });
    setIsShippingModified(true);
  };

  const handleSaveShipping = async () => {
    setSavingShipping(true);
    try {
      const payload = {
        shippingMethod: shippingData.shipping_method,
        carrierName: shippingData.carrier_name,
        trackingNumber: shippingData.tracking_number,
        shippingDate: shippingData.shipping_date,
        deliveryDate: shippingData.delivery_date,
        notes: shippingData.notes,
        shipped: shippingData.shipped
      };

      if (existingShipping && existingShipping.id) {
        await api.checklist.updateBoothShipping(existingShipping.id, payload);
      } else {
        await api.checklist.createBoothShipping(checklist.id, payload);
      }

      setIsShippingModified(false);
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error saving shipping:', error);
      alert('Failed to save booth shipping information');
    } finally {
      setSavingShipping(false);
    }
  };

  const toggleShipped = async () => {
    if (!existingShipping || !existingShipping.id) return;

    try {
      await api.checklist.updateBoothShipping(existingShipping.id, {
        shippingMethod: existingShipping.shipping_method,
        carrierName: existingShipping.carrier_name,
        trackingNumber: existingShipping.tracking_number,
        shippingDate: existingShipping.shipping_date,
        deliveryDate: existingShipping.delivery_date,
        notes: existingShipping.notes,
        shipped: !existingShipping.shipped
      });
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error toggling shipped:', error);
    }
  };

  return (
    <>
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

          <div className="mt-3 ml-9 space-y-2">
            <textarea
              value={boothNotes}
              onChange={(e) => setBoothNotes(e.target.value)}
              onBlur={handleBoothNotesBlur}
              placeholder="Add notes (booth number, size, location, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
              rows={2}
            />
            
            {/* Booth Map Upload/Display */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Map className="w-4 h-4" />
                  Booth Floor Plan
                </label>
                {checklist.booth_map_url && (
                  <button
                    onClick={handleDeleteBoothMap}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete map"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {checklist.booth_map_url ? (
                <div className="relative group">
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL || '/api'}${checklist.booth_map_url}`}
                    alt="Booth Map"
                    className="w-full h-32 object-contain bg-white rounded border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded flex items-center justify-center">
                    <button
                      onClick={() => boothMapInputRef.current?.click()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-gray-700 rounded-lg shadow-lg text-sm flex items-center gap-1"
                    >
                      <Upload className="w-4 h-4" />
                      Replace
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => boothMapInputRef.current?.click()}
                  disabled={uploadingMap}
                  className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm text-gray-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadingMap ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Floor Plan
                    </>
                  )}
                </button>
              )}
              
              <input
                ref={boothMapInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleBoothMapUpload}
                className="hidden"
              />
              
              <p className="text-xs text-gray-500 mt-1">
                Upload booth layout/map (JPG, PNG, GIF, PDF • Max 10MB)
              </p>
            </div>

            <div className="flex items-center gap-2">
              {receiptStatus.booth.length > 0 && (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {receiptStatus.booth.length} Receipt{receiptStatus.booth.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      const expense = receiptStatus.booth[0];
                      if (expense.receiptUrl) {
                        window.open(`${import.meta.env.VITE_API_BASE_URL || '/api'}${expense.receiptUrl}`, '_blank');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View receipt"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </>
              )}
              <button
                onClick={() => setShowReceiptUpload('booth')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Receipt className="w-4 h-4" />
                {receiptStatus.booth.length > 0 ? 'Add Another' : 'Upload Receipt'}
              </button>
            </div>
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

          <div className="mt-3 ml-9 space-y-2">
            <textarea
              value={electricityNotes}
              onChange={(e) => setElectricityNotes(e.target.value)}
              onBlur={handleElectricityNotesBlur}
              placeholder="Add notes (voltage, number of outlets, special requirements, etc.)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm resize-none"
              rows={2}
            />
            <div className="flex items-center gap-2">
              {receiptStatus.electricity.length > 0 && (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {receiptStatus.electricity.length} Receipt{receiptStatus.electricity.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      const expense = receiptStatus.electricity[0];
                      if (expense.receiptUrl) {
                        window.open(`${import.meta.env.VITE_API_BASE_URL || '/api'}${expense.receiptUrl}`, '_blank');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View receipt"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </>
              )}
              <button
                onClick={() => setShowReceiptUpload('electricity')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Receipt className="w-4 h-4" />
                {receiptStatus.electricity.length > 0 ? 'Add Another' : 'Upload Receipt'}
              </button>
            </div>
          </div>
        </div>

        {/* Booth Shipping Subsection */}
        <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium text-gray-900">Booth Shipping</h4>
            </div>
            
            {isShippingModified && (
              <button
                onClick={handleSaveShipping}
                disabled={savingShipping}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Shipped Checkbox */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleShipped}
                disabled={!existingShipping}
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {existingShipping?.shipped ? (
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="carrier"
                    checked={shippingData.shipping_method === 'carrier'}
                    onChange={(e) => handleShippingFieldChange('shipping_method', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Carrier Shipping</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="manual"
                    checked={shippingData.shipping_method === 'manual'}
                    onChange={(e) => handleShippingFieldChange('shipping_method', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Manual Delivery</span>
                </label>
              </div>
            </div>

            {/* Carrier Fields (only show if carrier method) */}
            {shippingData.shipping_method === 'carrier' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Carrier Name
                  </label>
                  <input
                    type="text"
                    value={shippingData.carrier_name || ''}
                    onChange={(e) => handleShippingFieldChange('carrier_name', e.target.value)}
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
                    onChange={(e) => handleShippingFieldChange('tracking_number', e.target.value)}
                    placeholder="Tracking/shipment number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {shippingData.shipping_method === 'carrier' ? 'Shipping Date' : 'Departure Date'}
                </label>
                <input
                  type="date"
                  value={shippingData.shipping_date || ''}
                  onChange={(e) => handleShippingFieldChange('shipping_date', e.target.value)}
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
                  onChange={(e) => handleShippingFieldChange('delivery_date', e.target.value)}
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
                onChange={(e) => handleShippingFieldChange('notes', e.target.value)}
                placeholder={
                  shippingData.shipping_method === 'carrier'
                    ? 'Shipment details, special instructions, contact info, etc.'
                    : 'Who is transporting, vehicle info, route details, etc.'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>

            {/* Receipt Upload Button */}
            <div className="flex items-center gap-2">
              {receiptStatus.booth_shipping.length > 0 && (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {receiptStatus.booth_shipping.length} Receipt{receiptStatus.booth_shipping.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => {
                      const expense = receiptStatus.booth_shipping[0];
                      if (expense.receiptUrl) {
                        window.open(`${import.meta.env.VITE_API_BASE_URL || '/api'}${expense.receiptUrl}`, '_blank');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View receipt"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </>
              )}
              <button
                onClick={() => setShowReceiptUpload('booth_shipping')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Receipt className="w-4 h-4" />
                {receiptStatus.booth_shipping.length > 0 ? 'Add Another' : 'Upload Receipt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Receipt Upload Modal */}
    {showReceiptUpload && (
      <ChecklistReceiptUpload
        user={user}
        event={event}
        section={showReceiptUpload}
        onClose={() => setShowReceiptUpload(null)}
        onExpenseCreated={handleReceiptCreated}
      />
    )}
    </>
  );
};

