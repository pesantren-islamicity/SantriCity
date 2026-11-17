import React, { useMemo } from 'react';
import QRCode from 'qrcode';

interface PermitSvgQrCodeProps {
  value: string;
  size?: number;
  label?: string;
  fgColor?: string;
  bgColor?: string;
  className?: string;
}

/**
 * Pure SVG-based QR Code generator component using QR matrix computation.
 * Renders a single crisp vector <path> inside an accessible <svg> element
 * with a standard quiet zone for reliable optical gate scanning.
 */
export const PermitSvgQrCode: React.FC<PermitSvgQrCodeProps> = ({
  value,
  size = 160,
  label = 'QR Code Izin Keluar Santri',
  fgColor = '#09090b',
  bgColor = '#ffffff',
  className = '',
}) => {
  const { moduleCount, pathData } = useMemo(() => {
    const safeValue = value?.trim() || 'SC313-PERMIT';
    const qr = QRCode.create(safeValue, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const data = qr.modules.data;

    const commands: string[] = [];
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (data[row * count + col]) {
          commands.push(`M${col},${row}h1v1h-1z`);
        }
      }
    }

    return {
      moduleCount: count,
      pathData: commands.join(''),
    };
  }, [value]);

  const quietZone = 2;
  const viewBoxSize = moduleCount + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={`block select-none ${className}`}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      <g transform={`translate(${quietZone}, ${quietZone})`}>
        <path d={pathData} fill={fgColor} />
      </g>
    </svg>
  );
};
