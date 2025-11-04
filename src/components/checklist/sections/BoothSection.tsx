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
  
  // Booth shipping state - support multiple shipments
  const [showAddShipmentForm, setShowAddShipmentForm] = useState(false);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [newShipmentData, setNewShipmentData] = useState<Omit<BoothShippingData, 'id' | 'shipped'>>({
    shipping_method: 'carrier',
    carrier_name: null,
    tracking_number: null,
    shipping_date: null,
    delivery_date: null,
    notes: null
  });
  const [savingShipment, setSavingShipment] = useState(false);

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

  const handleNewShipmentFieldChange = (field: keyof typeof newShipmentData, value: any) => {
    setNewShipmentData({ ...newShipmentData, [field]: value });
  };

  const handleAddShipment = async () => {
    setSavingShipment(true);
    try {
      const payload = {
        shippingMethod: newShipmentData.shipping_method,
        carrierName: newShipmentData.carrier_name,
        trackingNumber: newShipmentData.tracking_number,
        shippingDate: newShipmentData.shipping_date,
        deliveryDate: newShipmentData.delivery_date,
        notes: newShipmentData.notes,
        shipped: false
      };

      await api.checklist.createBoothShipping(checklist.id, payload);
      
      // Reset form
      setNewShipmentData({
        shipping_method: 'carrier',
        carrier_name: null,
        tracking_number: null,
        shipping_date: null,
        delivery_date: null,
        notes: null
      });
      setShowAddShipmentForm(false);
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error adding shipment:', error);
      alert('Failed to add booth shipment');
    } finally {
      setSavingShipment(false);
    }
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to delete this shipment?')) return;

    try {
      await api.checklist.deleteBoothShipping(shipmentId);
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error deleting shipment:', error);
      alert('Failed to delete shipment');
    }
  };

  const toggleShipped = async (shipment: BoothShippingData) => {
    if (!shipment.id) return;

    try {
      await api.checklist.updateBoothShipping(shipment.id, {
        shippingMethod: shipment.shipping_method,
        carrierName: shipment.carrier_name,
        trackingNumber: shipment.tracking_number,
        shippingDate: shipment.shipping_date,
        deliveryDate: shipment.delivery_date,
        notes: shipment.notes,
        shipped: !shipment.shipped
      });
      onReload();
    } catch (error) {
      console.error('[BoothSection] Error toggling shipped:', error);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-4">
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
              {checklist.boothShipping.length > 0 && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                  {checklist.boothShipping.length} Shipment{checklist.boothShipping.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setShowAddShipmentForm(!showAddShipmentForm)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
            >
              <Package className="w-4 h-4" />
              {showAddShipmentForm ? 'Cancel' : 'Add Shipment'}
            </button>
          </div>

          <div className="space-y-3">
            {/* Existing Shipments List */}
            {checklist.boothShipping.map((shipment) => (
              <div key={shipment.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => toggleShipped(shipment)}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {shipment.shipped ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 hover:scale-110 transition-transform" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        shipment.shipping_method === 'carrier' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {shipment.shipping_method === 'carrier' ? 'Carrier' : 'Manual'}
                      </span>
                      {shipment.shipped && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Shipped
                        </span>
                      )}
                    </div>
                    
                    {shipment.shipping_method === 'carrier' && (
                      <div className="space-y-1 text-sm">
                        {shipment.carrier_name && (
                          <p className="text-gray-700">
                            <span className="font-medium">Carrier:</span> {shipment.carrier_name}
                          </p>
                        )}
                        {shipment.tracking_number && (
                          <p className="text-gray-700">
                            <span className="font-medium">Tracking:</span> {shipment.tracking_number}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-4 text-xs text-gray-600 mt-2">
                      {shipment.shipping_date && (
                        <span>Shipped: {new Date(shipment.shipping_date).toLocaleDateString()}</span>
                      )}
                      {shipment.delivery_date && (
                        <span>Delivery: {new Date(shipment.delivery_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    {shipment.notes && (
                      <p className="text-xs text-gray-600 mt-2 italic">{shipment.notes}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteShipment(shipment.id!)}
                    className="flex-shrink-0 p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete shipment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Shipment Form */}
            {showAddShipmentForm && (
              <div className="border border-purple-300 rounded-lg p-4 bg-purple-50">
                <h5 className="font-medium text-gray-900 mb-3 text-sm">New Shipment</h5>
                
                {/* Shipping Method */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Shipping Method
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="carrier"
                        checked={newShipmentData.shipping_method === 'carrier'}
                        onChange={(e) => handleNewShipmentFieldChange('shipping_method', e.target.value)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Carrier Shipping</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="manual"
                        checked={newShipmentData.shipping_method === 'manual'}
                        onChange={(e) => handleNewShipmentFieldChange('shipping_method', e.target.value)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Manual Delivery</span>
                    </label>
                  </div>
                </div>

                {/* Carrier Fields */}
                {newShipmentData.shipping_method === 'carrier' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Carrier Name
                      </label>
                      <input
                        type="text"
                        value={newShipmentData.carrier_name || ''}
                        onChange={(e) => handleNewShipmentFieldChange('carrier_name', e.target.value)}
                        placeholder="e.g., FedEx, UPS, Road Runner"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tracking Number
                      </label>
                      <input
                        type="text"
                        value={newShipmentData.tracking_number || ''}
                        onChange={(e) => handleNewShipmentFieldChange('tracking_number', e.target.value)}
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
                      Shipping Date
                    </label>
                    <input
                      type="date"
                      value={newShipmentData.shipping_date || ''}
                      onChange={(e) => handleNewShipmentFieldChange('shipping_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Expected Delivery
                    </label>
                    <input
                      type="date"
                      value={newShipmentData.delivery_date || ''}
                      onChange={(e) => handleNewShipmentFieldChange('delivery_date', e.target.value)}
                      min={newShipmentData.shipping_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newShipmentData.notes || ''}
                    onChange={(e) => handleNewShipmentFieldChange('notes', e.target.value)}
                    placeholder="Shipment details, special instructions, contact info, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
                    rows={2}
                  />
                </div>

                <button
                  onClick={handleAddShipment}
                  disabled={savingShipment}
                  className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {savingShipment ? 'Adding...' : 'Add Shipment'}
                </button>
              </div>
            )}

            {/* Receipt Upload Button */}
            {checklist.boothShipping.length === 0 && !showAddShipmentForm && (
              <p className="text-sm text-gray-500 text-center py-4">
                No shipments added yet. Click "Add Shipment" to get started.
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
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

