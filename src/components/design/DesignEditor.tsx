'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardDesign, CardDesignCreate } from '@/types';
import { createDesign, updateDesign, uploadLogo, uploadStamp, activateDesign } from '@/api';
import { useBusiness } from '@/contexts/business-context';
import CardPreview from './CardPreview';
import ColorPicker from './ColorPicker';
import ImageUploader from './ImageUploader';
import FieldEditor from './FieldEditor';

interface DesignEditorProps {
  design?: CardDesign;
  isNew?: boolean;
}

const DEFAULT_DESIGN: CardDesignCreate = {
  name: '',
  organization_name: '',
  description: '',
  logo_text: '',
  foreground_color: 'rgb(255, 255, 255)',
  background_color: 'rgb(139, 90, 43)',
  label_color: 'rgb(255, 255, 255)',
  total_stamps: 10,
  stamp_filled_color: 'rgb(255, 215, 0)',
  stamp_empty_color: 'rgb(80, 50, 20)',
  stamp_border_color: 'rgb(255, 255, 255)',
  secondary_fields: [{ key: 'reward', label: 'REWARD', value: 'Free item at 10 stamps!' }],
  auxiliary_fields: [],
  back_fields: [
    { key: 'terms', label: 'Terms & Conditions', value: 'Earn 1 stamp per purchase. Stamps expire after 1 year.' },
  ],
};

export default function DesignEditor({ design, isNew = false }: DesignEditorProps) {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [formData, setFormData] = useState<CardDesignCreate & { logo_url?: string }>(
    design ? { ...design } : { ...DEFAULT_DESIGN }
  );
  const [isActive, setIsActive] = useState(design?.is_active ?? false);
  const [previewStamps, setPreviewStamps] = useState(3);
  const [showBack, setShowBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!currentBusiness?.id) return;
    if (!formData.name || !formData.organization_name || !formData.description) {
      setError('Please fill in all required fields (Name, Organization, Description)');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isNew) {
        const created = await createDesign(currentBusiness.id, formData);
        router.push(`/design/${created.id}`);
      } else if (design) {
        await updateDesign(currentBusiness.id, design.id, formData);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save design');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!design || !currentBusiness?.id) return;
    if (!confirm('Activate this design? All customers will receive the updated card.')) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await activateDesign(currentBusiness.id, design.id);
      setIsActive(true);
      setSuccessMessage('Design activated! All customers have been notified.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setSaving(false);
    }
  };

  const handlePushUpdate = async () => {
    if (!design || !currentBusiness?.id) return;
    if (!confirm('Push this design to all customers? They will receive updated cards.')) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await activateDesign(currentBusiness.id, design.id);
      setSuccessMessage('Updates pushed to all customers!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push updates');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!design || !currentBusiness?.id) {
      throw new Error('Please save the design first before uploading images');
    }
    const result = await uploadLogo(currentBusiness.id, design.id, file);
    updateField('logo_url', result.url);
  };

  const handleStampUpload = async (file: File, type: 'filled' | 'empty') => {
    if (!design || !currentBusiness?.id) {
      throw new Error('Please save the design first before uploading images');
    }
    await uploadStamp(currentBusiness.id, design.id, file, type);
    router.refresh();
  };

  return (
    <div className="design-editor">
      {/* Settings Panel */}
      <div className="design-editor-sidebar">
        <div className="editor-section">
          <h3 className="section-title">Basic Info</h3>
          <div className="form-group">
            <label>Design Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Summer Theme"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Organization Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Coffee Shop"
              value={formData.organization_name}
              onChange={(e) => updateField('organization_name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Description *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Loyalty Card"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Logo Text (shown if no logo image)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., CAFE"
              value={formData.logo_text || ''}
              onChange={(e) => updateField('logo_text', e.target.value)}
            />
          </div>
        </div>

        <div className="editor-section">
          <h3 className="section-title">Colors</h3>
          <ColorPicker
            label="Background Color"
            value={formData.background_color || 'rgb(139, 90, 43)'}
            onChange={(c) => updateField('background_color', c)}
          />
          <ColorPicker
            label="Text Color"
            value={formData.foreground_color || 'rgb(255, 255, 255)'}
            onChange={(c) => updateField('foreground_color', c)}
          />
          <ColorPicker
            label="Label Color"
            value={formData.label_color || 'rgb(255, 255, 255)'}
            onChange={(c) => updateField('label_color', c)}
          />
        </div>

        <div className="editor-section">
          <h3 className="section-title">Stamps</h3>
          <div className="form-group">
            <label>Total Stamps</label>
            <select
              className="input"
              value={formData.total_stamps || 10}
              onChange={(e) => updateField('total_stamps', parseInt(e.target.value))}
            >
              <option value={2}>2 stamps</option>
              <option value={4}>4 stamps</option>
              <option value={6}>6 stamps</option>
              <option value={8}>8 stamps</option>
              <option value={10}>10 stamps</option>
            </select>
          </div>
          <ColorPicker
            label="Filled Stamp Color"
            value={formData.stamp_filled_color || 'rgb(255, 215, 0)'}
            onChange={(c) => updateField('stamp_filled_color', c)}
          />
          <ColorPicker
            label="Empty Stamp Color"
            value={formData.stamp_empty_color || 'rgb(80, 50, 20)'}
            onChange={(c) => updateField('stamp_empty_color', c)}
          />
          <ColorPicker
            label="Stamp Border Color"
            value={formData.stamp_border_color || 'rgb(255, 255, 255)'}
            onChange={(c) => updateField('stamp_border_color', c)}
          />
        </div>

        <div className="editor-section">
          <h3 className="section-title">Logo</h3>
          <ImageUploader
            label="Logo Image"
            value={formData.logo_url}
            onUpload={handleLogoUpload}
            hint="PNG recommended, max 2MB"
          />
        </div>

        <div className="editor-section">
          <h3 className="section-title">Pass Fields</h3>
          <FieldEditor
            title="Secondary Fields"
            fields={formData.secondary_fields || []}
            onChange={(f) => updateField('secondary_fields', f)}
            maxFields={3}
          />
          <FieldEditor
            title="Auxiliary Fields"
            fields={formData.auxiliary_fields || []}
            onChange={(f) => updateField('auxiliary_fields', f)}
            maxFields={3}
          />
          <FieldEditor
            title="Back Fields"
            fields={formData.back_fields || []}
            onChange={(f) => updateField('back_fields', f)}
            maxFields={10}
          />
        </div>
      </div>

      {/* Preview Panel */}
      <div className="design-editor-preview">
        <div className="editor-preview-header">
          <h3>Live Preview</h3>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setShowBack(!showBack)}
          >
            {showBack ? 'Show Front' : 'Show Back'}
          </button>
        </div>

        <CardPreview design={formData} stamps={previewStamps} showBack={showBack} />

        <div className="preview-controls">
          <label>Preview Stamps: {previewStamps}</label>
          <input
            type="range"
            min={0}
            max={formData.total_stamps || 10}
            value={previewStamps}
            onChange={(e) => setPreviewStamps(parseInt(e.target.value))}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMessage && <div className="success-message-inline">{successMessage}</div>}

        <div className="editor-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : isNew ? 'Create Design' : 'Save Changes'}
          </button>

          {design && !isActive && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleActivate}
              disabled={saving}
            >
              Activate Design
            </button>
          )}

          {design && isActive && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePushUpdate}
              disabled={saving}
            >
              Update Customer Cards
            </button>
          )}

          {isActive && (
            <span className="active-indicator">This design is currently active</span>
          )}
        </div>
      </div>
    </div>
  );
}
