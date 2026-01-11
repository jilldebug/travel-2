"use client";

import { useState, useEffect } from "react";

// --- 型別定義 ---
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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const metaTags = [
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
        { name: "apple-mobile-web-app-capable", content: "yes" }
      ];
      metaTags.forEach(tag => {
        let m = document.querySelector(`meta[name="${tag.name}"]`);
        if (!m) {
          m = document.createElement('meta');
          (m as HTMLMetaElement).name = tag.name;
          document.head.appendChild(m);
        }
        (m as HTMLMetaElement).content = tag.content;
      });
    }
  }, []);

  useEffect(() => {
    const savedTrips = localStorage.getItem("my_travel_v4");
    const savedRates = localStorage.getItem("my_travel_rates");
    if (savedTrips) setTrips(JSON.parse(savedTrips));
    if (savedRates) setRates(JSON.parse(savedRates));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("my_travel_v4", JSON.stringify(trips));
      localStorage.setItem("my_travel_rates", JSON.stringify(rates));
    }
  }, [trips, rates, isLoaded]);

  const createNewTrip = () => {
    const title = prompt("請輸入旅程名稱：", "我的 2026 之旅");
    if (!title) return;
    const newTrip: Trip = { id: `trip-${Date.now()}`, tripTitle: title, hotelLink: "", plans: [] };
    setTrips([...trips, newTrip]);
    setActiveTripId(newTrip.id);
  };

  if (!isLoaded) return null;

  if (!activeTripId || !trips.find(t => t.id === activeTripId)) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] p-6 flex flex-col items-center">
        <div className="w-full max-w-md">
          <header className="flex justify-between items-center my-10">
            <h1 className="text-3xl font-[1000] text-slate-900 tracking-tighter">My Trips</h1>
            <button onClick={createNewTrip} className="bg-blue-600 text-white w-12 h-12 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-2xl font-bold">+</button>
          </header>
          <div className="space-y-4">
            {trips.map(trip => (
              <div key={trip.id} onClick={() => setActiveTripId(trip.id)} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 active:scale-95 transition-all">
                <div className="text-[10px] font-black text-blue-500 mb-1 uppercase tracking-widest">{trip.plans.length} Days</div>
                <h3 className="text-xl font-black text-slate-800">{trip.tripTitle}</h3>
                <div className="mt-4 flex justify-end">
                  <button onClick={(e) => { e.stopPropagation(); if(confirm("確定刪除？")) setTrips(trips.filter(t => t.id !== trip.id)); }} className="text-slate-300 text-xs font-bold hover:text-red-400">Delete</button>
                </div>
              </div>
            ))}
            {trips.length === 0 && (
              <div className="text-center py-20 text-slate-300 font-bold">目前沒有旅程，點擊上方 + 號建立</div>
            )}
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
          dailyTitle: "新行程",
          items: [], memo: "", expenses: []
        });
      }
      setPlans(newPlans); setRangeStart(null); setIsCollapsed(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-20 flex flex-col items-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative border-x border-slate-50">
        
        {/* 返回按鈕 */}
        <button onClick={onBack} className="absolute top-6 left-6 z-[100] bg-white/80 backdrop-blur-md w-10 h-10 rounded-full shadow-md flex items-center justify-center font-black text-slate-800 border border-slate-100">←</button>

        {!isCollapsed ? (
          <div className="p-8 pt-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl mb-8">
              <h2 className="text-2xl font-black mb-6 text-center">🗓️ 選擇旅程日期</h2>
              <div className="grid grid-cols-4 gap-2 mb-8">
                {["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((m, i) => (
                  <button key={m} onClick={() => setSelectedMonth(i)} className={`py-2 text-xs font-black rounded-xl transition-all ${selectedMonth === i ? "bg-blue-600 text-white" : "bg-white/10 text-white/40"}`}>{m}</button>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["日","一","二","三","四","五","六"].map(d => <div key={d} className="text-[10px] font-black text-white/20 mb-2">{d}</div>)}
                {Array.from({ length: new Date(2026, selectedMonth, 1).getDay() }).map((_, i) => <div key={i} />)}
                {Array.from({ length: new Date(2026, selectedMonth + 1, 0).getDate() }).map((_, i) => (
                  <button key={i} onClick={() => handleDateSelection(i+1)} className={`w-9 h-9 text-xs font-black rounded-full transition-all flex items-center justify-center ${rangeStart === i+1 ? "bg-yellow-400 text-black scale-110 shadow-lg" : "hover:bg-white/10"}`}>{i+1}</button>
                ))}
              </div>
              {rangeStart && <div className="text-center mt-6 text-xs font-bold text-yellow-400">請選擇結束日期...</div>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* 頂部天數切換 */}
            <div className="flex bg-white sticky top-0 z-50 border-b overflow-x-auto no-scrollbar pt-4">
              {trip.plans.map((p, i) => (
                <button key={i} onClick={() => { setActiveTab(i); setIsEditing(false); }} className={`px-6 py-4 min-w-[100px] flex flex-col items-center border-b-4 transition-all ${activeTab === i ? "border-blue-600 text-blue-600" : "border-transparent text-slate-300"}`}>
                  <div className="text-[9px] font-black uppercase tracking-tighter">Day {i + 1}</div>
                  <div className="text-md font-black">{p.date}</div>
                </button>
              ))}
              <button onClick={() => setIsCollapsed(false)} className="px-6 text-slate-200">⚙️</button>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-end mb-8">
                <div className="flex-1 mr-4">
                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{trip.plans[activeTab].weekday}</div>
                  {isEditing ? (
                    <input type="text" value={trip.plans[activeTab].dailyTitle} onChange={(e) => { const n = [...trip.plans]; n[activeTab].dailyTitle = e.target.value; setPlans(n); }} className="text-3xl font-black border-b-2 border-blue-200 outline-none w-full bg-transparent" />
                  ) : (
                    <h2 className="text-3xl font-[1000] text-slate-900 tracking-tighter leading-none">{trip.plans[activeTab].dailyTitle}</h2>
                  )}
                </div>
                <button onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)} className={`px-5 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all ${isEditing ? "bg-green-500 text-white" : "bg-slate-900 text-white"}`}>
                  {isEditing ? "SAVE" : "EDIT"}
                </button>
              </div>

              {/* View Selector */}
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
                {(["行程", "提醒事項", "記帳"] as ViewMode[]).map(mode => (
                  <button key={mode} onClick={() => setActiveView(mode)} className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${activeView === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>{mode}</button>
                ))}
              </div>

              {/* Content Area */}
              <div className="space-y-6">
                {activeView === "行程" && (
                  <div className="space-y-8">
                    {trip.plans[activeTab].items.map((item, idx) => (
                      <div key={item.id} className="relative pl-12 border-l-2 border-slate-100 pb-2">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                        <div className="flex justify-between items-start mb-2">
                           <div className="text-xs font-black text-slate-400">{item.startTime} — {item.endTime}</div>
                           <div className="flex gap-2">
                             <div onClick={() => item.mapLink && window.open(item.mapLink, "_blank")} className={`text-sm ${item.mapLink ? "opacity-100" : "opacity-10"}`}>📍</div>
                             {isEditing && <button onClick={() => { const n = [...trip.plans]; n[activeTab].items.splice(idx, 1); setPlans(n); }} className="text-red-300 text-xs">✕</button>}
                           </div>
                        </div>
                        {isEditing ? (
                          <input type="text" value={item.location} onChange={(e) => { const n = [...trip.plans]; n[activeTab].items[idx].location = e.target.value; setPlans(n); }} className="w-full text-lg font-black border-b border-slate-100 outline-none pb-1" placeholder="輸入地點名稱" />
                        ) : (
                          <div onClick={() => { const n = [...trip.plans]; n[activeTab].items[idx].isExpanded = !n[activeTab].items[idx].isExpanded; setPlans(n); }} className="text-lg font-black text-slate-800 active:text-blue-600">{item.location || "點擊輸入地點"}</div>
                        )}
                        
                        {(item.isExpanded || isEditing) && (
                          <div className="mt-4 bg-slate-50 rounded-2xl p-4 animate-in fade-in zoom-in-95">
                            <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
                              {["交通", "附近美食", "廁所", "注意事項"].map((cat) => (
                                <button key={cat} onClick={() => { const n = [...trip.plans]; n[activeTab].items[idx].activeCategory = cat as Category; setPlans(n); }} className={`px-3 py-1.5 rounded-lg text-[9px] font-black whitespace-nowrap ${item.activeCategory === cat ? "bg-slate-900 text-white" : "bg-white text-slate-400"}`}>{cat}</button>
                              ))}
                            </div>
                            <textarea value={item.notes[item.activeCategory]} onChange={(e) => { const n = [...trip.plans]; n[activeTab].items[idx].notes[item.activeCategory] = e.target.value; setPlans(n); }} className="w-full bg-transparent text-sm outline-none min-h-[80px]" placeholder="補充說明..." />
                          </div>
                        )}
                      </div>
                    ))}
                    {isEditing && (
                      <button onClick={() => { const n = [...trip.plans]; n[activeTab].items.push({ id: `item-${Date.now()}`, startTime: "09:00", endTime: "10:00", location: "", mapLink: "", activeCategory: "交通", notes: { "交通": "", "附近美食": "", "廁所": "", "注意事項": "" }, isExpanded: true }); setPlans(n); }} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 font-black text-sm hover:bg-slate-50 transition-all">+ 新增地點</button>
                    )}
                  </div>
                )}

                {activeView === "提醒事項" && (
                  <textarea value={trip.plans[activeTab].memo} onChange={(e) => { const n = [...trip.plans]; n[activeTab].memo = e.target.value; setPlans(n); }} className="w-full h-[60vh] bg-slate-50 rounded-[2.5rem] p-8 outline-none text-slate-700 font-medium border-none shadow-inner" placeholder="這天有什麼需要注意的？" />
                )}

                {activeView === "記帳" && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                      <div className="relative z-10">
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Expense</div>
                          <select value={totalDisplayCurrency} onChange={(e) => setTotalDisplayCurrency(e.target.value as Currency)} className="bg-white/10 text-white px-2 py-1 rounded-lg text-[10px] font-bold outline-none border border-white/10">
                            {["TWD", "JPY", "KRW", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="text-4xl font-[1000] mb-6">
                          <span className="text-blue-400 mr-2">{totalDisplayCurrency}</span>
                          {Math.round((trip.plans[activeTab].expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0) * rates[exp.currency], 0)) / rates[totalDisplayCurrency]).toLocaleString()}
                        </div>
                        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                          {Object.entries(rates).map(([cur, rate]) => cur !== "TWD" && (
                            <div key={cur}>
                              <div className="text-[8px] font-black text-white/30 uppercase">{cur} Rate</div>
                              <input type="number" step="0.0001" value={rate as number} onChange={(e) => setRates({...rates, [cur]: Number(e.target.value)})} className="bg-transparent text-xs font-black outline-none w-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {trip.plans[activeTab].expenses.map((exp, eIdx) => (
                      <div key={exp.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="flex-1">
                          <input type="text" value={exp.name} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].name = e.target.value; setPlans(n); }} className="font-black text-slate-800 outline-none w-full" placeholder="消費名稱" />
                          <div className="text-[10px] font-bold text-slate-300 uppercase">{exp.category}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" value={exp.amount} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].amount = e.target.value; setPlans(n); }} className="w-16 text-right font-black text-slate-900 outline-none" />
                          <select value={exp.currency} onChange={(e) => { const n = [...trip.plans]; n[activeTab].expenses[eIdx].currency = e.target.value as Currency; setPlans(n); }} className="text-[10px] font-black bg-slate-100 p-1 rounded">
                            {["TWD", "JPY", "KRW", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { const n = [...trip.plans]; n[activeTab].expenses.push({ id: Math.random().toString(), category: "餐飲", name: "", amount: "", currency: "TWD" }); setPlans(n); }} className="w-full py-5 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 font-black text-xs hover:bg-slate-50">+ Add Expense</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}