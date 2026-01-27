'use client';

import { useEffect, useRef } from 'react';
import { CardDesign, PassField } from '@/types';

interface CardPreviewProps {
  design: Partial<CardDesign>;
  stamps?: number;
  showBack?: boolean;
}

export default function CardPreview({ design, stamps = 3, showBack = false }: CardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalStamps = design.total_stamps ?? 10;
  const filledColor = design.stamp_filled_color ?? 'rgb(255, 215, 0)';
  const emptyColor = design.stamp_empty_color ?? 'rgb(80, 50, 20)';
  const borderColor = design.stamp_border_color ?? 'rgb(255, 255, 255)';
  const bgColor = design.background_color ?? 'rgb(139, 90, 43)';
  const fgColor = design.foreground_color ?? 'rgb(255, 255, 255)';
  const labelColor = design.label_color ?? 'rgb(255, 255, 255)';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate stamp layout (2 rows)
    const stampsPerRow = Math.ceil(totalStamps / 2);
    const stampRadius = 18;
    const horizontalSpacing = (width - 40) / stampsPerRow;
    const verticalSpacing = 50;
    const startX = 20 + horizontalSpacing / 2;
    const startY = height / 2 - verticalSpacing / 2 + 5;

    // Draw stamps
    for (let i = 0; i < totalStamps; i++) {
      const row = Math.floor(i / stampsPerRow);
      const col = i % stampsPerRow;
      const x = startX + col * horizontalSpacing;
      const y = startY + row * verticalSpacing;

      const isFilled = i < stamps;

      // Draw stamp circle
      ctx.beginPath();
      ctx.arc(x, y, stampRadius, 0, Math.PI * 2);
      ctx.fillStyle = isFilled ? filledColor : emptyColor;
      ctx.fill();

      // Draw border
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw checkmark for filled stamps
      if (isFilled) {
        ctx.beginPath();
        ctx.strokeStyle = bgColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x - 2, y + 6);
        ctx.lineTo(x + 10, y - 6);
        ctx.stroke();
      }
    }
  }, [stamps, totalStamps, filledColor, emptyColor, borderColor, bgColor]);

  const renderField = (field: PassField, isLabel: boolean = false) => (
    <div key={field.key} className="pass-field">
      <span className="field-label" style={{ color: labelColor, opacity: 0.8 }}>
        {field.label}
      </span>
      <span className="field-value" style={{ color: fgColor }}>
        {field.value}
      </span>
    </div>
  );

  return (
    <div className={`card-preview-container ${showBack ? 'flipped' : ''}`}>
      <div className="card-preview-inner">
        {/* Front of card */}
        <div className="card-preview-front" style={{ backgroundColor: bgColor }}>
          {/* Header */}
          <div className="pass-header">
            <div className="pass-logo">
              {design.logo_url ? (
                <img src={design.logo_url} alt="Logo" />
              ) : (
                <span style={{ color: fgColor, fontWeight: 600 }}>
                  {design.logo_text || design.organization_name || 'Your Brand'}
                </span>
              )}
            </div>
            <div className="pass-stamps-badge" style={{ color: fgColor }}>
              <span className="stamps-label" style={{ color: labelColor, opacity: 0.8 }}>STAMPS</span>
              <span className="stamps-value">{stamps} / {totalStamps}</span>
            </div>
          </div>

          {/* Strip with stamps */}
          <div className="pass-strip">
            <canvas ref={canvasRef} width={280} height={120} />
          </div>

          {/* Secondary fields */}
          {design.secondary_fields && design.secondary_fields.length > 0 && (
            <div className="pass-secondary-fields">
              {design.secondary_fields.map(f => renderField(f))}
            </div>
          )}

          {/* Auxiliary fields */}
          {design.auxiliary_fields && design.auxiliary_fields.length > 0 && (
            <div className="pass-auxiliary-fields">
              {design.auxiliary_fields.map(f => renderField(f))}
            </div>
          )}
        </div>

        {/* Back of card */}
        <div className="card-preview-back" style={{ backgroundColor: bgColor }}>
          <div className="pass-back-header" style={{ color: fgColor }}>
            {design.organization_name || 'Your Brand'}
          </div>
          <div className="pass-back-fields">
            {design.back_fields && design.back_fields.length > 0 ? (
              design.back_fields.map(f => (
                <div key={f.key} className="back-field">
                  <span className="field-label" style={{ color: labelColor, opacity: 0.8 }}>
                    {f.label}
                  </span>
                  <span className="field-value" style={{ color: fgColor }}>
                    {f.value}
                  </span>
                </div>
              ))
            ) : (
              <div className="no-fields" style={{ color: fgColor, opacity: 0.5 }}>
                No back fields configured
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
