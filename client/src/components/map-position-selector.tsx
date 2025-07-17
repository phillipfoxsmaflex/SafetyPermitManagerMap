import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import type { MapBackground } from '@shared/schema';

interface MapPositionSelectorProps {
  mapBackground?: MapBackground | null;
  selectedPosition?: { x: number; y: number } | null;
  onPositionChange?: (position: { x: number; y: number }) => void;
  disabled?: boolean;
}

export function MapPositionSelector({
  mapBackground,
  selectedPosition,
  onPositionChange,
  disabled = false
}: MapPositionSelectorProps) {
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [backgroundError, setBackgroundError] = useState(false);

  useEffect(() => {
    setBackgroundLoaded(false);
    setBackgroundError(false);
  }, [mapBackground]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onPositionChange) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onPositionChange({ x, y });
  };

  const handleBackgroundLoad = () => {
    setBackgroundLoaded(true);
    setBackgroundError(false);
  };

  const handleBackgroundError = () => {
    setBackgroundError(true);
    setBackgroundLoaded(false);
  };

  return (
    <div className="w-full h-full relative overflow-hidden rounded-lg">
      {/* Background Image */}
      {mapBackground?.imagePath && (
        <img
          src={mapBackground.imagePath}
          alt={mapBackground.name}
          className="w-full h-full object-cover"
          onLoad={handleBackgroundLoad}
          onError={handleBackgroundError}
        />
      )}

      {/* Loading State */}
      {mapBackground && !backgroundLoaded && !backgroundError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Karte wird geladen...</div>
        </div>
      )}

      {/* Error State */}
      {backgroundError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-red-500">Karte konnte nicht geladen werden</div>
        </div>
      )}

      {/* No Background State */}
      {!mapBackground && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Keine Karte verfügbar</div>
        </div>
      )}

      {/* Click Overlay */}
      {!disabled && (
        <div
          className="absolute inset-0 cursor-crosshair"
          onClick={handleMapClick}
          title="Klicken Sie, um die Position zu markieren"
        />
      )}

      {/* Position Marker */}
      {selectedPosition && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{
            left: `${selectedPosition.x}px`,
            top: `${selectedPosition.y}px`,
          }}
        >
          <MapPin
            className="h-6 w-6 text-red-500 drop-shadow-lg"
            fill="currentColor"
          />
        </div>
      )}

      {/* Instructions */}
      {!disabled && !selectedPosition && backgroundLoaded && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
          Klicken Sie auf die Karte, um die Position zu markieren
        </div>
      )}
    </div>
  );
}