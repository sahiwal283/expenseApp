import React, { useState, useRef } from 'react';
import { ChecklistData, BoothShippingData } from '../TradeShowChecklist';
import { api } from '../../../utils/api';
import { User, TradeShow, Expense } from '../../../App';
import { ChecklistReceiptUpload } from '../ChecklistReceiptUpload';
import { ReceiptsViewerModal } from '../ReceiptsViewerModal';
import {
  BoothOrderCard,
  ElectricityOrderCard,
  BoothShippingSection,
} from './BoothSection/index';
import { useBoothReceipts } from './BoothSection/hooks/useBoothReceipts';

interface BoothSectionProps {
  checklist: ChecklistData;
  user: User;
  event: TradeShow;
  onUpdate: (updates: Partial<ChecklistData>) => Promise<void>;
  onReload: () => void;
  saving: boolean;
}

export const BoothSection: React.FC<BoothSectionProps> = ({ checklist, user, event, onUpdate, onReload, saving }) => {
  const [boothNotes, setBoothNotes] = useState(checklist.booth_notes || '');
  const [electricityNotes, setElectricityNotes] = useState(checklist.electricity_notes || '');
  const [showReceiptUpload, setShowReceiptUpload] = useState<'booth' | 'electricity' | 'booth_shipping' | null>(null);
  const [uploadingMap, setUploadingMap] = useState(false);
  const boothMapInputRef = useRef<HTMLInputElement>(null);
  
  // Receipt viewer modal state
  const [viewingReceipts, setViewingReceipts] = useState<Expense[]>([]);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  
  // Booth shipping state - support multiple shipments
  const [showAddShipmentForm, setShowAddShipmentForm] = useState(false);
  const [newShipmentData, setNewShipmentData] = useState<Omit<BoothShippingData, 'id'>>({
    shipping_method: 'carrier',
    carrier_name: null,
    tracking_number: null,
    shipping_date: null,
    delivery_date: null,
    notes: null,
    shipped: false
  });
  const [savingShipment, setSavingShipment] = useState(false);

  // Use receipts hook
  const { receiptStatus, loadReceipts } = useBoothReceipts(event);

  const handleReceiptCreated = async () => {
    setShowReceiptUpload(null);
    // Reload checklist data
    await onReload();
    // Reload receipt status - wait for it to complete
    await loadReceipts();
    console.log('[BoothSection] Receipt created and data refreshed');
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

  const handleNewShipmentFieldChange = <K extends keyof Omit<BoothShippingData, 'id'>>(
    field: K,
    value: Omit<BoothShippingData, 'id'>[K]
  ) => {
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
        shipped: newShipmentData.shipped
      };

      await api.checklist.createBoothShipping(checklist.id, payload);
      
      // Reset form
      setNewShipmentData({
        shipping_method: 'carrier',
        carrier_name: null,
        tracking_number: null,
        shipping_date: null,
        delivery_date: null,
        notes: null,
        shipped: false
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

  const handleDeleteShipment = async (shipmentId: string | number) => {
    if (!confirm('Are you sure you want to delete this shipment?')) return;

    try {
      // Convert to number if it's a string
      const id = typeof shipmentId === 'string' ? parseInt(shipmentId, 10) : shipmentId;
      if (isNaN(id)) {
        console.error('[BoothSection] Invalid shipment ID:', shipmentId);
        return;
      }
      await api.checklist.deleteBoothShipping(id);
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
        <BoothOrderCard
          checklist={checklist}
          boothNotes={boothNotes}
          setBoothNotes={setBoothNotes}
          onBoothToggle={handleBoothToggle}
          onNotesBlur={handleBoothNotesBlur}
          onMapUpload={handleBoothMapUpload}
          onDeleteMap={handleDeleteBoothMap}
          uploadingMap={uploadingMap}
          saving={saving}
          receiptCount={receiptStatus.booth.length}
          onViewReceipt={() => {
            const receipts = receiptStatus.booth.filter(e => e.receiptUrl);
            if (receipts.length > 0) {
              setViewingReceipts(receipts);
              setShowReceiptsModal(true);
            }
          }}
          onUploadReceipt={() => setShowReceiptUpload('booth')}
          boothMapInputRef={boothMapInputRef}
        />
        
        <input
          ref={boothMapInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleBoothMapUpload}
          className="hidden"
        />

        <ElectricityOrderCard
          checklist={checklist}
          electricityNotes={electricityNotes}
          setElectricityNotes={setElectricityNotes}
          onElectricityToggle={handleElectricityToggle}
          onNotesBlur={handleElectricityNotesBlur}
          saving={saving}
          receiptCount={receiptStatus.electricity.length}
          onViewReceipt={() => {
            const receipts = receiptStatus.electricity.filter(e => e.receiptUrl);
            if (receipts.length > 0) {
              setViewingReceipts(receipts);
              setShowReceiptsModal(true);
            }
          }}
          onUploadReceipt={() => setShowReceiptUpload('electricity')}
        />

        <BoothShippingSection
          checklist={checklist}
          showAddShipmentForm={showAddShipmentForm}
          setShowAddShipmentForm={setShowAddShipmentForm}
          newShipmentData={newShipmentData}
          handleNewShipmentFieldChange={handleNewShipmentFieldChange}
          savingShipment={savingShipment}
          onAddShipment={handleAddShipment}
          onDeleteShipment={handleDeleteShipment}
          onToggleShipped={toggleShipped}
          receiptCount={receiptStatus.booth_shipping.length}
          onViewReceipt={() => {
            const receipts = receiptStatus.booth_shipping.filter(e => e.receiptUrl);
            if (receipts.length > 0) {
              setViewingReceipts(receipts);
              setShowReceiptsModal(true);
            }
          }}
          onUploadReceipt={() => setShowReceiptUpload('booth_shipping')}
        />
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

    {/* Receipts Viewer Modal */}
    <ReceiptsViewerModal
      receipts={viewingReceipts}
      isOpen={showReceiptsModal}
      onClose={() => {
        setShowReceiptsModal(false);
        setViewingReceipts([]);
      }}
    />
    </>
  );
};

