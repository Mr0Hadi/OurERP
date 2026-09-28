import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// رفعِ مشکلِ شناخته‌شده‌ی آیکونِ پیش‌فرضِ Leaflet با باندلرهایی مثلِ Vite
// (بدونِ این، آیکونِ مارکر شکسته نمایش داده می‌شود).
const markerIconSet = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER = [35.6892, 51.389]; // تهران

function ClickableMarker({ position, onChange }) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} icon={markerIconSet} /> : null;
}

// حرکتِ برنامه‌ای نقشه به نقطه‌ی تازه (نتیجه‌ی جست‌وجو یا GPS). هر هدفِ تازه یک
// آبجکتِ تازه است، پس انتخابِ دوباره‌ی همان نقطه هم نقشه را جابه‌جا می‌کند.
function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.position, target.zoom ?? 15, { duration: 1 });
  }, [map, target]);
  return null;
}

/**
 * خودِ نقشه — تنها فایلی که Leaflet را import می‌کند. `LocationPickerMap` آن را
 * lazy بار می‌کند تا Leaflet فقط وقتی دیالوگِ نقشه باز شد دانلود شود، نه همراهِ
 * هر فرمی که دکمه‌ی «انتخاب از نقشه» دارد.
 */
export default function MapCanvas({ initialPosition, position, flyTarget, onPositionChange }) {
  return (
    <MapContainer
      center={initialPosition || DEFAULT_CENTER}
      zoom={initialPosition ? 15 : 12}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickableMarker position={position} onChange={onPositionChange} />
      <FlyTo target={flyTarget} />
    </MapContainer>
  );
}
