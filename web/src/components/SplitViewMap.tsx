import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import 'leaflet.sync';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { fromArrayBuffer, fromUrl, GeoTIFF } from 'geotiff';
import { Aoi, ProcessedOutputs } from '../App';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface SplitViewMapProps {
  imageA: File | null;
  imageB: File | null;
  imageAId: string | null;
  imageBId: string | null;
  aoi: Aoi | null;
  onAoiChange: (aoi: Aoi | null) => void;
  mapARef: React.RefObject<L.Map>;
  mapBRef: React.RefObject<L.Map>;
  showProcessed: boolean;
  processedOutputs: ProcessedOutputs | null;
}

const useRasterLayer = (
  mapRef: React.RefObject<L.Map>,
  image: File | null,
  imageId: string | null,
  showProcessed: boolean,
  processedUrl: string | undefined
) => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      // @ts-ignore
      if (layer.georaster) {
        map.removeLayer(layer);
      }
    });

    let url: string | undefined;
    let isObjectURL = false;

    if (showProcessed && processedUrl) {
      url = processedUrl;
    } else if (image) {
      url = URL.createObjectURL(image);
      isObjectURL = true;
    }

    if (url) {
      const parseGeoraster = (raster: GeoTIFF) => {
        const layer = new (GeoRasterLayer as any)({
          georaster: raster,
          opacity: 0.7,
          resolution: 256,
        });
        layer.addTo(map);
        map.fitBounds(layer.getBounds());
      };

      if (showProcessed) {
        fetch(url)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            fromArrayBuffer(arrayBuffer).then(parseGeoraster);
          });
      } else {
        fromUrl(url).then(parseGeoraster);
      }
    }

    return () => {
      if (url && isObjectURL) {
        URL.revokeObjectURL(url);
      }
    };
  }, [mapRef, image, imageId, showProcessed, processedUrl]);
};

function SplitViewMap({ 
  imageA, 
  imageB, 
  imageAId, 
  imageBId, 
  aoi, 
  onAoiChange, 
  mapARef, 
  mapBRef, 
  showProcessed, 
  processedOutputs 
}: SplitViewMapProps): JSX.Element {
  const featureGroupRefA = useRef<L.FeatureGroup>(null);
  const featureGroupRefB = useRef<L.FeatureGroup>(null);

  useRasterLayer(mapARef, imageA, imageAId, showProcessed, processedOutputs?.imageAUrl);
  useRasterLayer(mapBRef, imageB, imageBId, showProcessed, processedOutputs?.imageBUrl);

  useEffect(() => {
    if (mapARef.current && mapBRef.current) {
      mapARef.current.sync(mapBRef.current);
      mapBRef.current.sync(mapARef.current);
    }
  }, [mapARef, mapBRef]);

  useEffect(() => {
    const featureGroupA = featureGroupRefA.current;
    const featureGroupB = featureGroupRefB.current;

    if (featureGroupA && featureGroupB) {
      featureGroupA.clearLayers();
      featureGroupB.clearLayers();

      if (aoi) {
        const bounds = L.latLngBounds([
          [aoi.south, aoi.west],
          [aoi.north, aoi.east],
        ]);
        featureGroupA.addLayer(L.rectangle(bounds));
        featureGroupB.addLayer(L.rectangle(bounds));
      }
    }
  }, [aoi]);

  const onCreated = (e: any) => {
    const { layer } = e;
    const bounds = layer.getBounds();
    onAoiChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  };

  const onEdited = (e: any) => {
    const { layers } = e;
    layers.eachLayer((layer: any) => {
      const bounds = layer.getBounds();
      onAoiChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    });
  };

  const onDeleted = () => {
    onAoiChange(null);
  };

  return (
    <div className="flex-grow flex">
      <MapContainer center={[0, 0]} zoom={2} ref={mapARef} className="flex-grow">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FeatureGroup ref={featureGroupRefA}>
          <EditControl
            position="topright"
            onCreated={onCreated}
            onEdited={onEdited}
            onDeleted={onDeleted}
            draw={{
              rectangle: true,
              circle: false,
              polygon: false,
              polyline: false,
              marker: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
      <MapContainer center={[0, 0]} zoom={2} ref={mapBRef} className="flex-grow">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FeatureGroup ref={featureGroupRefB} />
      </MapContainer>
    </div>
  );
}

export default SplitViewMap;
