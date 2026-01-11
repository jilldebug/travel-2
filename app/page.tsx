"use client";

import { useState, useEffect } from "react";

// --- 型別定義保持不變 ---
type Category = "交通" | "附近美食" | "廁所" | "注意事項";
type ViewMode = "行程" | "提醒事項" | "記帳";
type Currency = "TWD" | "JPY" | "KRW" | "EUR";

interface ExpenseItem { id: string; category: string; name: string; amount: string; currency: Currency; }
interface ScheduleItem { 
  id: string; startTime: string; endTime: string; location: string; mapLink: string; 
  activeCategory: Category; notes: Record<Category, string>; isExpanded?: boolean; 
}
interface DailyPlan { 
  date: string; weekday: string; dailyTitle: string; 
  items: ScheduleItem[]; memo: string; expenses: ExpenseItem[]; 
}
interface Trip { id: string; tripTitle: string; hotelLink: string; plans: DailyPlan[]; }

export default function TravelApp() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<Currency, number>>({ TWD: 1, JPY: 0.21, KRW: 0.023, EUR: 34.5 });
  const [isLoaded, setIsLoaded] = useState(false);

  // --- 新增：App 化自動注入邏輯 (不影響原有功能) ---
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // 1. 自動注入 PWA 描述檔
      let manifest = document.getElementById('pwa-manifest');
      if (!manifest) {
        manifest = document.createElement('link');
        manifest.id = 'pwa-manifest';
        (manifest as HTMLLinkElement).rel = 'manifest';
        const manifestData = {
          "short_name": "旅行規劃",
          "name": "我的2026旅行計畫",
          "display": "standalone",
          "start_url": "./",
          "theme_color": "#000000",
          "background_color": "#ffffff"
        };
        (manifest as HTMLLinkElement).href = 'data:application/json,' + encodeURIComponent(JSON.stringify(manifestData));
        document.head.appendChild(manifest);
      }

      // 2. 注入 iPhone 全螢幕與縮放控制標籤
      const metaTags = [
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" }
      ];
      metaTags.forEach(tag => {
        if (!document.querySelector(`meta[name="${tag.name}"]`)) {
          const m = document.createElement('meta');
          m.name = tag.name;
          m.content = tag.content;
          document.head.appendChild(m);
        }
      });
    }
  }, []);

  // --- 原有邏輯：讀取資料 ---
  useEffect(() => {
    const savedTrips = localStorage.getItem("my_travel_v4");
    const savedRates = localStorage.getItem("my_travel_rates");
    if (savedTrips) setTrips(JSON.parse(savedTrips));
    if (savedRates) setRates(JSON.parse(savedRates));
    setIsLoaded(true);
  }, []);

  // --- 原有邏輯：儲存資料 ---
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("my_travel_v4", JSON.stringify(trips));
      localStorage.setItem("my_travel_rates", JSON.stringify(rates));
    }
  }, [trips, rates, isLoaded]);

  const createNewTrip = () => {
    const title = prompt("請輸入旅程名稱：", "我的新日本之旅");
    if (!title) return;
    const newTrip: Trip = { id: `trip-${Date.now()}`, tripTitle: title, hotelLink: "", plans: [] };
    setTrips([...trips, newTrip]);
    setActiveTripId(newTrip.id);
  };

  if (!isLoaded) return null;

  if (!activeTripId || !trips.find(t => t.id === activeTripId)) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 md:p-20 text-slate-900">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-black tracking-tight">我的行程總覽</h1>
            <button onClick={createNewTrip} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all">+ 建立新旅程</button>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map(trip => (
              <div key={trip.id} onClick={() => setActiveTripId(trip.id)} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl transition-all">
                <div className="text-[10px] font-black text-blue-500 mb-2 uppercase tracking-widest">{trip.plans.length} Days</div>
                <h3 className="text-2xl font-black mb-4">{trip.tripTitle}</h3>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("確定刪除？")) setTrips(trips.filter(t => t.id !== trip.id)); }} className="text-red-400 text-xs font-bold">刪除旅程</button>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return <Planner trip={trips.find(t => t.id === activeTripId)!} rates={rates} setRates={setRates} updateTrip={(updated) => setTrips(trips.map(t => t.id === updated.id ? updated : t))} onBack={() => setActiveTripId(null)} />;
}

function Planner({ trip, rates, setRates, updateTrip, onBack }: { trip: Trip, rates: any, setRates: any, updateTrip: (t: Trip) => void, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeView, setActiveView] = useState<ViewMode>("行程");
  const [isEditing, setIsEditing] = useState(false);
  const [totalDisplayCurrency, setTotalDisplayCurrency] = useState<Currency>("TWD");
  const [isCollapsed, setIsCollapsed] = useState(trip.plans.length > 0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [rangeStart, setRangeStart] = useState<number | null>(null);

  const setPlans = (newPlans: DailyPlan[]) => updateTrip({ ...trip, plans: newPlans });

  const handleSaveAndSort = () => {
    const newPlans = [...trip.plans];
    const day = newPlans[activeTab];
    
    let processedItems = day.items.map(item => {
      if (item.startTime > item.endTime) {
        return { ...item, startTime: item.endTime, endTime: item.startTime };
      }
      return item;
    });

    processedItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (let i = 1; i < processedItems.length; i++) {
      if (processedItems[i].startTime < processedItems[i-1].startTime) {
        processedItems[i].startTime = processedItems[i-1].startTime;
        if (processedItems[i].endTime < processedItems[i].startTime) {
          processedItems[i].endTime = processedItems[i].startTime;
        }
      }
    }

    day.items = processedItems;
    setPlans(newPlans);
    setIsEditing(false);
  };

  const handleDateSelection = (day: number) => {
    if (rangeStart === null) setRangeStart(day);
    else {
      const start = Math.min(rangeStart, day);
      const end = Math.max(rangeStart, day);
      const newPlans: DailyPlan[] = [];
      for (let d = start; d <= end; d++) {
        const dateObj = new Date(2026, selectedMonth, d);
        newPlans.push({
          date: `${selectedMonth + 1}/${d}`,
          weekday: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][dateObj.getDay()],
          dailyTitle: "我的新旅行",
          items: [], memo: "", expenses: []
        });
      }
      setPlans(newPlans); setRangeStart(null); setIsCollapsed(true);
    }
  };

  const TimeSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const [h, m] = value.split(":");
    return (
      <div className="flex gap-1 bg-slate-50 border rounded-lg p-1 shrink-0">
        <select value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className="bg-transparent outline-none font-bold text-xs">
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <span className="text-xs font-bold">:</span>
        <select value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className="bg-transparent outline-none font-bold text-xs">
          {["00", "15", "30", "45"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-sans">
      <button onClick={onBack} className="fixed top-8 left-8 z-[100] bg-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center font-black">←</button>
      
      <div className="max-w-2xl mx-auto pt-20 px-4">
        {!isCollapsed && (
          <div className="bg-white p-8 rounded-[3rem] shadow-xl mb-8 text-center animate-in zoom-in-95">
             <h2 className="text-2xl font-black mb-6">🗓️ 設定日期 (2026)</h2>
             <div className="grid grid-cols-4 gap-2 mb-6">
                {["一月", "二月", "三月", "四月", "五月", "六月", "七月", "結八月", "九月", "十月", "十一月", "十二月"].map((m, i) => (
                  <button key={m} onClick={() => setSelectedMonth(i)} className={`py-2 text-xs font-bold rounded-xl ${selectedMonth === i ? "bg-black text-white" : "bg-slate-100 text-slate-400"}`}>{m}</button>
                ))}
             </div>
             <div className="grid grid-cols-7 gap-1">
                {["日","一","二","三","四","五","六"].map(d => <div key={d} className="text-[10px] font-black text-slate-300">{d}</div>)}
                {Array.from({ length: new Date(2026, selectedMonth, 1).getDay() }).map((_, i) => <div key={i} />)}
                {Array.from({ length: new Date(2026, selectedMonth + 1, 0).getDate() }).map((_, i) => (
                  <button key={i} onClick={() => handleDateSelection(i+1)} className={`w-10 h-10 text-xs font-bold rounded-full ${rangeStart === i+1 ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}>{i+1}</button>
                ))}
             </div>
          </div>
        )}

        {trip.plans.length > 0 && (
          <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex bg-white sticky top-0 z-50 border-b overflow-x-auto no-scrollbar">
              {trip.plans.map((p, i) => (
                <button key={i} onClick={() => { setActiveTab(i); setIsEditing(false); }} className={`px-8 py-5 min-w-[120px] flex flex-col items-center border-b-4 transition-all ${activeTab === i ? "border-blue-600 text-blue-600" : "border-transparent text-slate-300"}`}>
                  <div className="text-[9px] font-black opacity-40">Day {i + 1}</div>
                  <div className="text-lg font-black">{p.date}</div>
                  <div className="text-[10px] font-bold opacity-70">{p.weekday}</div>
                </button>
              ))}
              <button onClick={() => setIsCollapsed(false)} className="px-6 text-slate-200">⚙️</button>
            </div>

            <div className="px-10 pt-10 flex justify-between items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={trip.plans[activeTab].dailyTitle} 
                    onChange={(e) => { const n = [...trip.plans]; n[activeTab].dailyTitle = e.target.value; setPlans(n); }}
                    className="text-3xl font-black border-b-2 border-blue-200 outline-none w-full bg-transparent"
                  />
                ) : (
                  <h2 className="text-3xl font-black tracking-tight">{trip.plans[activeTab].dailyTitle}</h2>
                )}
                <div 
                  onClick={() => { 
                    if (isEditing) { 
                      const link = prompt("住宿 Google Map 連結:", trip.hotelLink); 
                      if (link !== null) updateTrip({ ...trip, hotelLink: link }); 
                    } else if (trip.hotelLink) window.open(trip.hotelLink, "_blank"); 
                  }} 
                  className={`p-3 rounded-2xl cursor-pointer text-2xl ${trip.hotelLink ? "bg-orange-50 text-orange-500 shadow-md" : "bg-slate-50 text-slate-200"}`}
                >⛺️</div>
              </div>
              <button onClick={() => isEditing ? handleSaveAndSort() : setIsEditing(true)} className={`px-8 py-3 rounded-full font-black text-sm shadow-lg ${isEditing ? "bg-green-500 text-white" : "bg-slate-900 text-white"}`}>
                {isEditing ? "完成編輯" : "編輯行程"}
              </button>
            </div>

            <div className="px-10 mt-8 flex gap-8 border-b border-slate-50">
              {(["行程", "提醒事項", "記帳"] as ViewMode[]).map(mode => (
                <button key={mode} onClick={() => setActiveView(mode)} className={`pb-4 text-sm font-black transition-all relative ${activeView === mode ? "text-slate-900" : "text-slate-300"}`}>
                  {mode}
                  {activeView === mode && <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-full" />}
                </button>
              ))}
            </div>

            <div className="p-10">
              {activeView === "行程" && (
                <div className="space-y-10">
                  {trip.plans[activeTab].items.map((item, idx) => (
                    <div key={item.id} className="flex gap-6 items-start">
                      <div className="w-20 shrink-0 text-center">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 scale-90">
                            <TimeSelector value={item.startTime} onChange={(v) => { const n = [...trip.plans]; n[activeTab].items[idx].startTime = v; setPlans(n); }} />
                            <TimeSelector value={item.endTime} onChange={(v) => { const n = [...trip.plans]; n[activeTab].items[idx].endTime = v; setPlans(n); }} />
                          </div>
                        ) : (
                          <div className="text-lg font-black text-slate-800 leading-tight">
                            {item.startTime === item.endTime ? (
                              item.startTime
                            ) : (
                              <>
                                {item.startTime}<br/>
                                <span className="text-slate-200 text-xs">▼</span><br/>
                                {item.endTime}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div onClick={() => { if (isEditing) { const link = prompt("地點地圖連結:", item.mapLink); if (link !== null) { const n = [...trip.plans]; n[activeTab].items[idx].mapLink = link; setPlans(n); } } else if (item.mapLink) window.open(item.mapLink, "_blank"); }} className={`p-3 rounded-xl cursor-pointer ${item.mapLink ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-200"}`}>📍</div>
                          {isEditing ? (
                            <input type="text" value={item.location} onChange={(e) => { const n = [...trip.plans]; n[activeTab].items[idx].location = e.target.value; setPlans(n); }} className="flex-1 text-2xl font-black border-b-2 border-slate-100 outline-none bg-transparent" placeholder="輸入地點" />
                          ) : (
                            <div onClick={() => { const n = [...trip.plans]; n[activeTab].items[idx].isExpanded = !n[activeTab].items[idx].isExpanded; setPlans(n); }} className="text-2xl font-black flex-1 cursor-pointer hover:text-blue-600 transition-colors">
                              {item.location || "未命名地點"}
                            </div>
                          )}
                          {isEditing && <button onClick={() => { const n = [...trip.plans]; n[activeTab].items.splice(idx, 1); setPlans(n); }} className="text-slate-200 hover:text-red-500">✕</button>}
                        </div>
                        
                        {(item.isExpanded || isEditing) && (
                          <div className="mt-6 space-y-4">
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                              {["交通", "附近美食", "廁所", "注意事項"].map((cat) => (
                                <button key={cat} onClick={() => { const n = [...trip.plans]; n[activeTab].items[idx].activeCategory = cat as Category; setPlans(n); }} className={`px-4 py-1.5 rounded-full text-[10px] font-black ${item.activeCategory === cat ? "bg-black text-white" : "bg-slate-100 text-slate-400"}`}>{cat}</button>
                              ))}
                            </div>
                            <textarea 
                              disabled={!isEditing}
                              value={item.notes[item.activeCategory]} 
                              onChange={(e) => { const n = [...trip.plans]; n[activeTab].items[idx].notes[item.activeCategory] = e.target.value; setPlans(n); }} 
                              className={`w-full p-4 text-sm rounded-2xl min-h-[100px] outline-none ${isEditing ? "bg-slate-50 border border-blue-50" : "bg-slate-50/50 italic text-slate-500"}`}
                              placeholder="點擊編輯輸入詳細資訊..." 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isEditing && (
                    <button onClick={() => { const n = [...trip.plans]; n[activeTab].items.push({ id: `item-${Date.now()}`, startTime: "09:00", endTime: "10:00", location: "", mapLink: "", activeCategory: "交通", notes: { "交通": "", "附近美食": "", "廁所": "", "注意事項": "" }, isExpanded: true }); setPlans(n); }} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 font-bold hover:bg-slate-50">+ 新增行程地點</button>
                  )}
                </div>
              )}

              {activeView === "提醒事項" && (
                <textarea value={trip.plans[activeTab].memo} onChange={(e) => { const n = [...trip.plans]; n[activeTab].memo = e.target.value; setPlans(n); }} className="w-full h-80 bg-slate-50 rounded-3xl p-6 outline-none text-slate-700 leading-relaxed" placeholder="在這裡寫下這天的提醒..." />
              )}

              {activeView === "記帳" && (
                <div className="space-y-6">
                  <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-xs font-black text-blue-300 tracking-widest uppercase">總支出統計</div>
                      <select value={totalDisplayCurrency} onChange={(e) => setTotalDisplayCurrency(e.target.value as Currency)} className="bg-blue-800 text-white px-3 py-1 rounded-lg text-xs font-bold outline-none">
                        {["TWD", "JPY", "KRW", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="text-5xl font-black mb-6">
                      {totalDisplayCurrency === "EUR" ? "€" : totalDisplayCurrency === "JPY" ? "¥" : totalDisplayCurrency === "KRW" ? "₩" : "$"}
                      {Math.round((trip.plans[activeTab].expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0) * rates[exp.currency], 0)) / rates[totalDisplayCurrency]).toLocaleString()}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-bold">
                      {Object.entries(rates).map(([cur, rate]) => cur !== "TWD" && (
                        <div key={cur} className="bg-white/5 p-2 rounded-xl">
                          <div className="opacity-40 mb-1 uppercase">{cur} 匯率</div>
                          <input type="number" step="0.0001" value={rate as number} onChange={(e) => setRates({...rates, [cur]: Number(e.target.value)})} className="bg-transparent outline-none w-full text-white" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {trip.plans[activeTab].expenses.map((exp, eIdx) => (
                      <div key={exp.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between">
                          <input type="text" value={exp.category} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].category = e.target.value; setPlans(n); }} className="text-[10px] font-black uppercase bg-slate-50 px-4 py-1.5 rounded-full outline-none w-24" placeholder="類別" />
                          <button onClick={() => { const n = [...trip.plans]; n[activeTab].expenses.splice(eIdx, 1); setPlans(n); }} className="text-slate-200 hover:text-red-500 text-xs">移除</button>
                        </div>
                        <div className="flex gap-4">
                          <input type="text" value={exp.name} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].name = e.target.value; setPlans(n); }} className="flex-1 font-black text-lg outline-none border-b border-transparent focus:border-blue-100" placeholder="消費名稱" />
                          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                            <input type="text" value={exp.amount} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].amount = e.target.value; setPlans(n); }} className="w-20 text-right font-black outline-none bg-transparent" placeholder="0" />
                            <select value={exp.currency} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].currency = e.target.value as Currency; setPlans(n); }} className="text-xs font-bold bg-transparent outline-none">
                              {["TWD", "JPY", "KRW", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { const n = [...trip.plans]; n[activeTab].expenses.push({ id: Math.random().toString(), category: "餐飲", name: "", amount: "", currency: "TWD" }); setPlans(n); }} className="w-full py-6 border-2 border-dashed border-slate-100 rounded-3xl text-slate-300 font-bold hover:bg-slate-50 transition-all">+ 新增一筆消費</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}