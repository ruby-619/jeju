/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Calendar, 
  MapPin, 
  Navigation, 
  ChevronRight, 
  Info, 
  Coffee, 
  Utensils, 
  Camera, 
  Home,
  Car,
  Loader2,
  Clock,
  Route
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet default icon issue in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Types
interface Location {
  id: string;
  name: string;
  coords: [number, number];
  note: string;
  type: 'airport' | 'rental' | 'food' | 'nature' | 'stay' | 'market' | 'art';
}

interface RouteSegment {
  positions: [number, number][];
  distance: number; // meters
  duration: number; // seconds
  fromName: string;
  toName: string;
}

interface DayItinerary {
  day: number;
  title: string;
  routeTitle: string;
  color: string;
  locations: Location[];
}

// Itinerary Data
const ITINERARY: DayItinerary[] = [
  {
    day: 1,
    title: '第一天：東北海岸與內陸',
    routeTitle: '濟州機場 ➔ 東北海岸 ➔ 東部內陸',
    color: '#3b82f6', // blue-500
    locations: [
      { id: '1-1', name: '濟州機場', coords: [33.5113, 126.4930], note: '抵達濟州島', type: 'airport' },
      { id: '1-2', name: '樂天租車', coords: [33.5050, 126.4950], note: 'Gate 2 櫃台確認，Gate 5 接駁車', type: 'rental' },
      { id: '1-3', name: '倫敦貝果博物館', coords: [33.5564, 126.7123], note: '使用 Catch Table APP 線上抽號碼牌', type: 'food' },
      { id: '1-4', name: '月汀里海灘', coords: [33.5552, 126.7960], note: '絕美海景，周邊順遊', type: 'nature' },
      { id: '1-5', name: 'Snoopy Garden', coords: [33.4633, 126.7797], note: '建議預留 2.5 ~ 3 小時', type: 'nature' },
      { id: '1-6', name: '鹿山路櫻花公路', coords: [33.3854, 126.7135], note: '粉紅櫻花與金黃油菜花絕景', type: 'nature' },
      { id: '1-7', name: '住宿：Green Narae Pension', coords: [33.4542, 126.8921], note: '有可愛貓咪，手作早餐', type: 'stay' },
    ]
  },
  {
    day: 2,
    title: '第二天：東南海岸與西歸浦',
    routeTitle: '東部住宿 ➔ 沿東南海岸線 ➔ 西歸浦市',
    color: '#10b981', // emerald-500
    locations: [
      { id: '2-1', name: '涉地可支', coords: [33.4243, 126.9311], note: '海岸懸崖散步，春季花卉', type: 'nature' },
      { id: '2-2', name: '正房瀑布', coords: [33.2448, 126.5718], note: '亞洲唯一直接落入海中的瀑布', type: 'nature' },
      { id: '2-3', name: '李仲燮藝術街', coords: [33.2459, 126.5649], note: '文青小店與咖啡館', type: 'art' },
      { id: '2-4', name: '西歸浦每日偶來市場', coords: [33.2493, 126.5637], note: '炸雞、橘子大福，必逛市場', type: 'market' },
      { id: '2-5', name: '住宿：Red Hat Snail', coords: [33.2460, 126.5650], note: '位於藝術街上，位置便利', type: 'stay' },
    ]
  },
  {
    day: 3,
    title: '第三天：西部景點與市區',
    routeTitle: '西歸浦市 ➔ 西部景點 ➔ 濟州市區',
    color: '#f59e0b', // amber-500
    locations: [
      { id: '3-1', name: 'O\'sulloc 雪綠茶博物館', coords: [33.3061, 126.2895], note: '抹茶冰淇淋，綠茶園拍照', type: 'nature' },
      { id: '3-2', name: '涯月海岸公路', coords: [33.4625, 126.3106], note: '漢潭海岸散步路，海景咖啡廳', type: 'nature' },
      { id: '3-3', name: '濟州市區逛街', coords: [33.5100, 126.5200], note: '最後採買與逛街', type: 'market' },
      { id: '3-4', name: '住宿：濟州文提莫酒店', coords: [33.4915, 126.4975], note: '近機場，交通便利', type: 'stay' },
    ]
  }
];

// Helper to get icon based on type
const getIcon = (type: string) => {
  switch (type) {
    case 'airport': return <Navigation className="w-4 h-4" />;
    case 'rental': return <Car className="w-4 h-4" />;
    case 'food': return <Utensils className="w-4 h-4" />;
    case 'nature': return <Camera className="w-4 h-4" />;
    case 'stay': return <Home className="w-4 h-4" />;
    case 'market': return <Utensils className="w-4 h-4" />;
    case 'art': return <Coffee className="w-4 h-4" />;
    default: return <MapPin className="w-4 h-4" />;
  }
};

// Helper to format distance and time
const formatDistance = (meters: number) => (meters / 1000).toFixed(1) + ' km';
const formatDuration = (seconds: number) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return mins + ' 分鐘';
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours} 小時 ${remainingMins} 分鐘`;
};

// Component to handle map view changes
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  const [activeDay, setActiveDay] = useState<number | 'all'>(1);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [allRoutes, setAllRoutes] = useState<Record<number, RouteSegment[]>>({});
  const [isRouting, setIsRouting] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<{day: number, idx: number} | null>(null);

  const currentDay = useMemo(() => 
    ITINERARY.find(d => d.day === activeDay), 
  [activeDay]);

  // Fetch driving routes for all days
  useEffect(() => {
    const fetchAllRoutes = async () => {
      setIsRouting(true);
      const routesMap: Record<number, RouteSegment[]> = {};
      
      try {
        await Promise.all(ITINERARY.map(async (day) => {
          const coordsString = day.locations
            .map(loc => `${loc.coords[1]},${loc.coords[0]}`)
            .join(';');
          
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&steps=true`);
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const fullGeometry = route.geometry.coordinates;
            const legs = route.legs;
            const roadCoords = fullGeometry.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
            
            const roadSegments: RouteSegment[] = [];
            let coordOffset = 0;
            
            legs.forEach((leg: any, idx: number) => {
              const nextLoc = day.locations[idx + 1].coords;
              let bestIndex = coordOffset;
              let minDist = Infinity;
              
              for (let i = coordOffset; i < roadCoords.length; i++) {
                const d = Math.sqrt(Math.pow(roadCoords[i][0] - nextLoc[0], 2) + Math.pow(roadCoords[i][1] - nextLoc[1], 2));
                if (d < minDist) {
                  minDist = d;
                  bestIndex = i;
                }
              }
              
              roadSegments.push({
                positions: roadCoords.slice(coordOffset, bestIndex + 1),
                distance: leg.distance,
                duration: leg.duration,
                fromName: day.locations[idx].name,
                toName: day.locations[idx+1].name
              });
              coordOffset = bestIndex;
            });
            routesMap[day.day] = roadSegments;
          }
        }));
        setAllRoutes(routesMap);
      } catch (error) {
        console.error("Routing error:", error);
      } finally {
        setIsRouting(false);
      }
    };

    fetchAllRoutes();
  }, []);

  // Calculate center of current day's locations or all locations
  const mapCenter = useMemo(() => {
    let locations: Location[] = [];
    if (activeDay === 'all') {
      locations = ITINERARY.flatMap(d => d.locations);
    } else if (currentDay) {
      locations = currentDay.locations;
    }

    if (locations.length === 0) return [33.38, 126.55] as [number, number];

    const coords = locations.map(l => l.coords);
    const lat = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
    const lng = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
    return [lat, lng] as [number, number];
  }, [activeDay, currentDay]);

  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between z-10 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-lg">
            <Calendar className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">2026 濟州島之旅</h1>
            <p className="text-stone-500 text-sm">互動式行車路線地圖</p>
          </div>
        </div>
        
        <div className="flex bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveDay('all');
              setSelectedLocation(null);
              setHoveredSegment(null);
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
              activeDay === 'all' 
                ? "bg-white text-stone-900 shadow-sm" 
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            全部
          </button>
          {ITINERARY.map(day => (
            <button
              key={day.day}
              onClick={() => {
                setActiveDay(day.day);
                setSelectedLocation(null);
                setHoveredSegment(null);
              }}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                activeDay === day.day 
                  ? "bg-white text-stone-900 shadow-sm" 
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              Day {day.day}
            </button>
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-96 bg-white border-r border-stone-200 flex flex-col overflow-hidden z-10 h-1/2 md:h-full">
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold" style={{ color: activeDay === 'all' ? '#f97316' : currentDay?.color }}>
                {activeDay === 'all' ? '濟州島全覽行程' : currentDay?.title}
              </h2>
              {isRouting && (
                <div className="flex items-center gap-1 text-[10px] text-stone-400 font-bold uppercase animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  載入中
                </div>
              )}
            </div>
            <p className="text-stone-500 text-sm flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {activeDay === 'all' ? '一次查看所有日期的精彩行程' : currentDay?.routeTitle}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {activeDay === 'all' ? (
                  ITINERARY.map(day => (
                    <div key={day.day} className="mb-6">
                      <div className="flex items-center gap-2 mb-3 px-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: day.color }}></div>
                        <h3 className="font-bold text-sm text-stone-400 uppercase tracking-wider">Day {day.day}</h3>
                      </div>
                      <div className="space-y-2">
                        {day.locations.map((loc, idx) => (
                          <button
                            key={loc.id}
                            onClick={() => setSelectedLocation(loc)}
                            className={cn(
                              "w-full text-left p-3 rounded-xl border transition-all duration-200 group",
                              selectedLocation?.id === loc.id
                                ? "bg-stone-900 border-stone-900 text-white shadow-lg"
                                : "bg-white border-stone-100 hover:border-stone-300 hover:bg-stone-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                                selectedLocation?.id === loc.id
                                  ? "bg-white/20 text-white"
                                  : "bg-stone-100 text-stone-500"
                              )}>
                                {idx + 1}
                              </div>
                              <h4 className="font-bold text-sm flex-1 truncate">{loc.name}</h4>
                              <div className={cn(
                                "p-1 rounded-lg",
                                selectedLocation?.id === loc.id ? "bg-white/10" : "bg-stone-100"
                              )}>
                                {getIcon(loc.type)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  currentDay?.locations.map((loc, idx) => (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border transition-all duration-200 group",
                        selectedLocation?.id === loc.id
                          ? "bg-stone-900 border-stone-900 text-white shadow-lg scale-[1.02]"
                          : "bg-white border-stone-100 hover:border-stone-300 hover:bg-stone-50"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          selectedLocation?.id === loc.id
                            ? "bg-white/20 text-white"
                            : "bg-stone-100 text-stone-500 group-hover:bg-stone-200"
                        )}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold">{loc.name}</h3>
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              selectedLocation?.id === loc.id ? "bg-white/10" : "bg-stone-100"
                            )}>
                              {getIcon(loc.type)}
                            </div>
                          </div>
                          <p className={cn(
                            "text-xs leading-relaxed",
                            selectedLocation?.id === loc.id ? "text-stone-300" : "text-stone-500"
                          )}>
                            {loc.note}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="p-4 bg-stone-50 border-t border-stone-100">
            <div className="flex items-center gap-2 text-xs text-stone-400 font-medium uppercase tracking-wider mb-2">
              <Info className="w-3 h-3" />
              行車提醒
            </div>
            <p className="text-xs text-stone-500 italic">
              路線已根據道路網優化。滑鼠移至路線上可查看行車距離與時間。
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative h-1/2 md:h-full">
          <MapContainer 
            center={mapCenter} 
            zoom={11} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <ChangeView 
              center={selectedLocation ? selectedLocation.coords : mapCenter} 
              zoom={selectedLocation ? 14 : (activeDay === 'all' ? 10 : 11)} 
            />

            {/* Driving Route Segments */}
            {ITINERARY.map(day => {
              if (activeDay !== 'all' && activeDay !== day.day) return null;
              const segments = allRoutes[day.day] || [];
              return segments.map((seg, idx) => (
                <Polyline 
                  key={`${day.day}-${idx}`}
                  positions={seg.positions} 
                  eventHandlers={{
                    mouseover: () => setHoveredSegment({day: day.day, idx}),
                    mouseout: () => setHoveredSegment(null),
                  }}
                  pathOptions={{ 
                    color: hoveredSegment?.day === day.day && hoveredSegment?.idx === idx ? '#ef4444' : day.color, 
                    weight: hoveredSegment?.day === day.day && hoveredSegment?.idx === idx ? 8 : 5, 
                    opacity: hoveredSegment?.day === day.day && hoveredSegment?.idx === idx ? 1 : (activeDay === 'all' ? 0.6 : 0.8),
                    lineJoin: 'round',
                    lineCap: 'round'
                  }} 
                >
                  <Tooltip sticky direction="top" opacity={1} className="custom-tooltip">
                    <div className="p-2 min-w-[120px]">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase mb-2 border-b border-stone-100 pb-1">
                        <Navigation className="w-3 h-3" />
                        Day {day.day} 路段資訊
                      </div>
                      <div className="text-xs font-bold text-stone-800 mb-1">
                        {seg.fromName} ➔ {seg.toName}
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-center gap-2 text-xs text-stone-600">
                          <Route className="w-3 h-3 text-blue-500" />
                          <span>距離: <b>{formatDistance(seg.distance)}</b></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-600">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>預估: <b>{formatDuration(seg.duration)}</b></span>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              ));
            })}

            {/* Markers */}
            {ITINERARY.map(day => {
              if (activeDay !== 'all' && activeDay !== day.day) return null;
              return day.locations.map((loc, idx) => (
                <Marker 
                  key={loc.id} 
                  position={loc.coords}
                  eventHandlers={{
                    click: () => setSelectedLocation(loc),
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h4 className="font-bold text-sm mb-1">{loc.name}</h4>
                      <p className="text-xs text-stone-600">{loc.note}</p>
                      <div className="mt-2 text-[10px] text-stone-400 uppercase font-bold">
                        Day {day.day} - Step {idx + 1}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ));
            })}
          </MapContainer>

          {/* Map Overlay Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[1000]">
            <button 
              onClick={() => setSelectedLocation(null)}
              className="bg-white p-3 rounded-full shadow-xl border border-stone-200 hover:bg-stone-50 transition-colors"
              title="重設視角"
            >
              <Navigation className="w-5 h-5 text-stone-600" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-stone-200 z-[1000] hidden md:block">
            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
              路線圖例
            </div>
            <div className="space-y-2">
              {activeDay === 'all' ? (
                ITINERARY.map(day => (
                  <div key={day.day} className="flex items-center gap-3">
                    <div className="w-8 h-1 rounded-full" style={{ backgroundColor: day.color }}></div>
                    <span className="text-xs font-medium">Day {day.day}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-1 rounded-full" style={{ backgroundColor: currentDay?.color }}></div>
                  <span className="text-xs font-medium">Day {activeDay} 行車路徑</span>
                </div>
              )}
            </div>
            <div className="mt-2 text-[10px] text-stone-400 italic">
              * 懸停路段查看距離與時間
            </div>
          </div>
        </div>
      </main>
      
      <style>{`
        .custom-tooltip {
          background: white !important;
          border: 1px solid #e7e5e4 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
          padding: 0 !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: white !important;
        }
      `}</style>
    </div>
  );
}
