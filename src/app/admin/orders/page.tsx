"use client";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import Link from "next/link";

const ADMIN_PW_KEY = "nck_admin";
const ORDER_STATUSES = ["placed","confirmed","processing","shipped","delivered","cancelled"] as const;
const PAY_STATUSES = ["pending","advance_paid","partially_paid","fully_paid","failed"] as const;
const FILTERS = ["all","cod","razorpay","pending","fully_paid","processing","delivered"] as const;
type Filter = typeof FILTERS[number];

function sColor(s:string){const m:Record<string,string>={placed:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",confirmed:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",processing:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",shipped:"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",delivered:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",cancelled:"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"};return m[s]||"bg-gray-100 text-gray-700";}
function pColor(s:string){const m:Record<string,string>={pending:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",advance_paid:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",partially_paid:"bg-cyan-100 text-cyan-700",fully_paid:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",failed:"bg-red-100 text-red-700"};return m[s]||"bg-gray-100 text-gray-700";}
function label(s:string){return s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function fmt(n:number){return Number(n).toLocaleString("en-IN");}

export default function AdminOrdersPage(){
  const[isAuth,setIsAuth]=useState(false);
  const[pw,setPw]=useState("");
  const[authErr,setAuthErr]=useState("");
  const[orders,setOrders]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState<Filter>("all");
  const[search,setSearch]=useState("");
  const[selected,setSelected]=useState<any>(null);
  const[updating,setUpdating]=useState("");

  async function handleLogin(e:FormEvent){
    e.preventDefault();setAuthErr("");
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
    if(r.ok){setIsAuth(true);}else{setAuthErr("Wrong password");}
  }

  async function fetchOrders(){
    setLoading(true);
    try{const r=await fetch("/api/admin/orders");if(r.ok){const d=await r.json();setOrders(d.orders||[]);}}catch{}finally{setLoading(false);}
  }

  useEffect(()=>{if(isAuth)fetchOrders();},[isAuth]);

  async function updateStatus(orderId:string,field:"order_status"|"payment_status",value:string){
    setUpdating(orderId+field);
    await fetch("/api/admin/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:orderId,[field]:value})});
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,[field]:value}:o));
    if(selected?.id===orderId)setSelected((p:any)=>({...p,[field]:value}));
    setUpdating("");
  }

  async function quickAction(orderId:string,os?:string,ps?:string){
    setUpdating(orderId);
    const body:any={order_id:orderId};
    if(os)body.order_status=os;
    if(ps)body.payment_status=ps;
    await fetch("/api/admin/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,...(os?{order_status:os}:{}),...(ps?{payment_status:ps}:{})}:o));
    setUpdating("");
  }

  const filtered=useMemo(()=>{
    let list=orders;
    if(filter==="cod")list=list.filter(o=>o.payment_method==="cash_on_delivery");
    else if(filter==="razorpay")list=list.filter(o=>o.payment_method==="razorpay");
    else if(filter==="pending")list=list.filter(o=>o.payment_status==="pending");
    else if(filter==="fully_paid")list=list.filter(o=>o.payment_status==="fully_paid");
    else if(filter==="processing")list=list.filter(o=>o.order_status==="processing");
    else if(filter==="delivered")list=list.filter(o=>o.order_status==="delivered");
    if(search){const q=search.toLowerCase();list=list.filter(o=>o.id.toLowerCase().includes(q)||o.customer_name?.toLowerCase().includes(q)||o.shop_name?.toLowerCase().includes(q)||o.customer_phone?.includes(q));}
    return list;
  },[orders,filter,search]);

  const stats=useMemo(()=>({
    total:orders.length,
    pending:orders.filter(o=>o.payment_status==="pending").length,
    cod:orders.filter(o=>o.payment_method==="cash_on_delivery").length,
    revenue:orders.reduce((s,o)=>s+Number(o.total_amount),0),
    today:orders.filter(o=>new Date(o.created_at).toDateString()===new Date().toDateString()).length,
  }),[orders]);

  function exportCSV(){
    const rows=[["Order ID","Customer","Shop","Phone","GST","Total","Advance","Remaining","Payment Method","Payment Status","Order Status","Date"]];
    for(const o of filtered){
      rows.push([o.id.slice(0,8).toUpperCase(),o.customer_name,o.shop_name,o.customer_phone,o.gst_number,o.total_amount,o.advance_amount,o.remaining_amount,o.payment_method==="cash_on_delivery"?"COD":"Razorpay",label(o.payment_status),label(o.order_status),new Date(o.created_at).toLocaleDateString("en-IN")]);
    }
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`nck_orders_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  }

  const ic="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  if(!isAuth)return(
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gradient-start to-gradient-end shadow-lg"><svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg></div><h1 className="text-2xl font-bold text-foreground">Admin Orders</h1><p className="mt-1 text-sm text-muted">Enter admin password</p></div>
        <form onSubmit={handleLogin} className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
          {authErr&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">⚠ {authErr}</div>}
          <div className="mb-4"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} required placeholder="Admin password" className={ic} /></div>
          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-gradient-start to-gradient-end px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all">Login</button>
        </form>
        <div className="mt-4 text-center"><Link href="/admin" className="text-sm text-muted hover:text-primary">← Products Admin</Link></div>
      </div>
    </div>
  );

  return(
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-card-border bg-background/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end shadow-sm"><svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" /></svg></div><span className="font-bold text-foreground hidden sm:block">Orders Dashboard</span></div>
          <div className="flex items-center gap-3"><Link href="/admin" className="text-sm text-muted hover:text-primary">Products</Link><Link href="/" className="text-sm text-muted hover:text-primary">Website</Link><button onClick={()=>setIsAuth(false)} className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-muted hover:text-red-500">Logout</button></div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Analytics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[{l:"Total Orders",v:stats.total,c:"text-foreground"},{l:"Pending Pay",v:stats.pending,c:"text-amber-600"},{l:"COD Orders",v:stats.cod,c:"text-blue-600"},{l:"Revenue",v:`₹${fmt(stats.revenue)}`,c:"text-primary"},{l:"Today",v:stats.today,c:"text-purple-600"}].map(s=>(
            <div key={s.l} className="rounded-xl border border-card-border bg-card-bg p-4"><p className="text-[11px] font-medium text-muted uppercase tracking-wider">{s.l}</p><p className={`text-xl font-extrabold mt-1 ${s.c}`}>{s.v}</p></div>
          ))}
        </div>

        {/* Filters + Search + Export */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {FILTERS.map(f=><button key={f} onClick={()=>setFilter(f)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${filter===f?"bg-primary text-white":"bg-surface text-muted hover:text-foreground border border-card-border"}`}>{f==="all"?"All":f==="cod"?"COD":f==="razorpay"?"Razorpay":label(f)}</button>)}
          </div>
          <div className="flex gap-2">
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search orders..." className="rounded-full border border-card-border bg-surface px-4 py-1.5 text-sm outline-none focus:border-primary w-full sm:w-56" />
            <button onClick={exportCSV} className="whitespace-nowrap rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-semibold hover:bg-primary hover:text-white transition-all">Export CSV</button>
          </div>
        </div>

        {/* Orders */}
        {loading?(
          <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-20 bg-surface animate-shimmer rounded-xl" />)}</div>
        ):filtered.length===0?(
          <div className="text-center py-16"><p className="text-muted text-sm">No orders found.</p></div>
        ):(
          <div className="space-y-3">
            {filtered.map(o=>(
              <div key={o.id} className="rounded-xl border border-card-border bg-card-bg p-4 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* ID + Customer */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={()=>setSelected(o)} className="text-xs font-mono text-primary hover:underline cursor-pointer">#{o.id.slice(0,8).toUpperCase()}</button>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${sColor(o.order_status)}`}>{o.order_status}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${pColor(o.payment_status)}`}>{label(o.payment_status)}</span>
                      {o.payment_method==="cash_on_delivery"&&<span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400">COD</span>}
                    </div>
                    <p className="text-sm font-semibold text-foreground truncate">{o.customer_name} {o.shop_name&&<span className="text-muted font-normal">• {o.shop_name}</span>}</p>
                    <p className="text-xs text-muted">{o.customer_phone} • {new Date(o.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</p>
                  </div>
                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-foreground">₹{fmt(o.total_amount)}</p>
                    {o.payment_method==="razorpay"&&<p className="text-[11px] text-muted">Adv: ₹{fmt(o.advance_amount)} | Due: ₹{fmt(o.remaining_amount)}</p>}
                  </div>
                  {/* Quick Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={()=>setSelected(o)} className="rounded-lg border border-card-border px-2.5 py-1.5 text-xs text-muted hover:text-primary hover:border-primary/30 transition-colors">View</button>
                    {o.order_status!=="shipped"&&o.order_status!=="delivered"&&<button disabled={updating===o.id} onClick={()=>quickAction(o.id,"shipped")} className="rounded-lg bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-200 transition-colors disabled:opacity-50">Ship</button>}
                    {o.order_status!=="delivered"&&<button disabled={updating===o.id} onClick={()=>quickAction(o.id,"delivered")} className="rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-200 transition-colors disabled:opacity-50">Deliver</button>}
                    {o.payment_status!=="fully_paid"&&<button disabled={updating===o.id} onClick={()=>quickAction(o.id,undefined,"fully_paid")} className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors disabled:opacity-50">Paid</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected&&(
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={()=>setSelected(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-card-border bg-card-bg shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="sticky top-0 bg-card-bg border-b border-card-border px-5 py-4 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-2xl">
              <h2 className="text-sm font-bold text-foreground">Order #{selected.id.slice(0,8).toUpperCase()}</h2>
              <button onClick={()=>setSelected(null)} className="text-muted hover:text-foreground text-lg">✕</button>
            </div>
            <div className="px-5 py-5 space-y-5">
              {/* Customer */}
              <section>
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Customer</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-xs text-muted">Name</p><p className="font-semibold text-foreground">{selected.customer_name}</p></div>
                  <div><p className="text-xs text-muted">Phone</p><p className="font-semibold text-foreground">{selected.customer_phone}</p></div>
                  {selected.customer_whatsapp&&<div><p className="text-xs text-muted">WhatsApp</p><p className="font-semibold text-foreground">{selected.customer_whatsapp}</p></div>}
                  {selected.shop_name&&<div><p className="text-xs text-muted">Shop</p><p className="font-semibold text-foreground">{selected.shop_name}</p></div>}
                  {selected.gst_number&&<div><p className="text-xs text-muted">GST</p><p className="font-semibold text-foreground">{selected.gst_number}</p></div>}
                  {selected.pan_number&&<div><p className="text-xs text-muted">PAN</p><p className="font-semibold text-foreground">{selected.pan_number}</p></div>}
                </div>
              </section>
              {/* Address */}
              {selected.address&&(
                <section>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Shipping Address</h3>
                  <p className="text-sm text-foreground">{selected.address.address_line}{selected.address.landmark&&`, ${selected.address.landmark}`}</p>
                  <p className="text-sm text-muted">{selected.address.city}, {selected.address.state} - {selected.address.pincode}</p>
                  {selected.address.phone_number&&<p className="text-xs text-muted mt-1">📞 {selected.address.phone_number}</p>}
                </section>
              )}
              {/* Items */}
              <section>
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Items ({selected.items?.length||0})</h3>
                <div className="space-y-2">
                  {(selected.items||[]).map((it:any)=>(
                    <div key={it.id} className="flex justify-between items-start py-2 border-b border-card-border last:border-0">
                      <div><p className="text-sm font-semibold text-foreground">{it.product_name}</p><p className="text-xs text-muted">{it.variant_label} • {it.box_count} Box • {it.total_units} units @ ₹{Number(it.price_per_unit)}/u</p></div>
                      <p className="text-sm font-bold text-primary shrink-0">₹{fmt(it.total_price)}</p>
                    </div>
                  ))}
                </div>
              </section>
              {/* Payment */}
              <section>
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Payment</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted">Total</span><span className="font-bold">₹{fmt(selected.total_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Advance</span><span className="font-semibold text-primary">₹{fmt(selected.advance_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Remaining</span><span className="font-semibold">₹{fmt(selected.remaining_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Method</span><span className="font-semibold capitalize">{selected.payment_method==="cash_on_delivery"?"COD":"Razorpay"}</span></div>
                  {selected.razorpay_payment_id&&<div className="flex justify-between"><span className="text-muted">Razorpay ID</span><span className="font-mono text-xs">{selected.razorpay_payment_id}</span></div>}
                </div>
              </section>
              {/* Status Updates */}
              <section className="border-t border-card-border pt-4">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Update Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Order Status</label>
                    <select value={selected.order_status} onChange={e=>updateStatus(selected.id,"order_status",e.target.value)} disabled={!!updating} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm capitalize outline-none focus:border-primary">
                      {ORDER_STATUSES.map(s=><option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Payment Status</label>
                    <select value={selected.payment_status} onChange={e=>updateStatus(selected.id,"payment_status",e.target.value)} disabled={!!updating} className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm capitalize outline-none focus:border-primary">
                      {PAY_STATUSES.map(s=><option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
