const {createClient}=window.supabase;
const configured=()=>!window.SUPABASE_URL.includes("PUT_YOUR")&&!window.SUPABASE_ANON_KEY.includes("PUT_YOUR");
const db=()=>createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);
let sb=null,state={page:"login",user:null,profile:null,fields:[],field:null,date:new Date().toISOString().slice(0,10),start:"",end:"",pay:"Card",available:null};
const app=document.querySelector("#app");
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const money=x=>`${Number(x).toFixed(2)} ج.م`;
function note(t,ok=false){const e=document.querySelector("#msg");if(e){e.textContent=t;e.className="notice "+(ok?"success":"error")}}
function go(p){state.page=p;render()}
async function init(){
 if(!configured()){render();return}
 sb=db();
 const {data}=await sb.auth.getSession();
 state.user=data.session?.user||null;
 if(state.user) await loadProfile();
 sb.auth.onAuthStateChange(async(_e,session)=>{state.user=session?.user||null;if(state.user){await loadProfile();if(state.page==="login"||state.page==="signup")state.page="dashboard"}render()});
 render();
 if(state.user) await loadFields();
}
async function loadProfile(){
 const {data}=await sb.from("profiles").select("*").eq("id",state.user.id).maybeSingle();
 state.profile=data||{full_name:state.user.user_metadata?.full_name||state.user.email};
}
async function loadFields(){
 const {data,error}=await sb.from("sports_fields").select("*").order("field_id");
 if(!error) state.fields=data||[];
 if(!state.field&&state.fields.length)state.field=state.fields[0];
}
async function signup(){
 const name=document.querySelector("#name").value.trim(),email=document.querySelector("#email").value.trim(),pass=document.querySelector("#pass").value,confirm=document.querySelector("#confirm").value;
 if(!name||!email||!pass)return note("املأ كل البيانات");
 if(pass.length<6)return note("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
 if(pass!==confirm)return note("تأكيد كلمة المرور غير مطابق");
 const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{full_name:name}}});
 if(error)return note(error.message);
 if(data.session){state.user=data.user;await loadProfile();await loadFields();go("dashboard")}
 else note("تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.",true);
}
async function login(){
 const email=document.querySelector("#email").value.trim(),pass=document.querySelector("#pass").value;
 const {data,error}=await sb.auth.signInWithPassword({email,password:pass});
 if(error)return note(error.message);
 state.user=data.user;await loadProfile();await loadFields();go("dashboard");
}
async function logout(){await sb.auth.signOut();state.user=null;state.profile=null;state.page="login";render()}
function auth(mode){
 const sign=mode==="signup";
 return `<div class="login"><div class="hero"><div><h1>نظام حجز الملاعب الرياضية</h1><p>احجز ملعبك في أي وقت ومن أي مكان</p></div></div><div class="loginform"><div class="form">
<h1>${sign?"إنشاء حساب جديد":"مرحباً بعودتك"}</h1><p class="muted">${sign?"أنشئ حسابك لبدء الحجز":"سجل الدخول للوصول إلى حسابك"}</p><div id="msg" class="notice hide"></div>
${sign?`<label>الاسم الكامل</label><input id="name" class="input" placeholder="أدخل اسمك الكامل">`:""}
<label>البريد الإلكتروني</label><input id="${sign?"email":"email"}" class="input" type="email" placeholder="example@email.com">
<label>كلمة المرور</label><input id="pass" class="input" type="password" placeholder="أدخل كلمة المرور">
${sign?`<label>تأكيد كلمة المرور</label><input id="confirm" class="input" type="password" placeholder="أعد كتابة كلمة المرور">`:""}
<button class="btn primary full" onclick="${sign?"signup()":"login()"}">${sign?"إنشاء الحساب":"تسجيل الدخول"}</button>
<p>${sign?"لديك حساب بالفعل؟":"ليس لديك حساب؟"} <b class="link" onclick="go('${sign?"login":"signup"}')">${sign?"تسجيل الدخول":"إنشاء حساب جديد"}</b></p>
</div></div></div>`
}
function side(){
 return `<aside class="side"><div class="brand"><span class="ball">⚽</span><span>نظام حجز<br>الملاعب</span></div><nav class="nav">
${[["dashboard","الرئيسية"],["fields","الملاعب"],["bookings","حجوزاتي"],["payments","المدفوعات"],["profile","الملف الشخصي"]].map(x=>`<button class="${state.page===x[0]?"active":""}" onclick="go('${x[0]}')">${x[1]}</button>`).join("")}
<button onclick="logout()">تسجيل الخروج</button></nav></aside>`
}
function shell(body){return `<header class="top"><span>نظام حجز الملاعب الرياضية</span><span>مرحباً ${esc(state.profile?.full_name||state.user?.email||"")}</span></header><div class="layout">${side()}<main class="content">${body}</main></div>`}
function stat(n,t){return `<div class="stat"><div class="num">${esc(n)}</div><div>${t}</div></div>`}
function card(f){return `<article class="card"><img src="${esc(f.image_url)}"><div class="cardbody"><h3>${esc(f.field_name)}</h3><p class="muted">${esc(f.field_type)}</p><div class="row"><b class="price">${money(f.price)} / ساعة</b><button class="btn primary" onclick="selectField(${f.field_id})">احجز الآن</button></div></div></article>`}
async function selectField(id){state.field=state.fields.find(x=>x.field_id===id);go("booking")}
function dashboard(){return shell(`<h1 class="title">لوحة تحكم العميل (الرئيسية)</h1><div class="grid4">${stat("0","مدفوعات معلقة")}${stat("—","إجمالي المدفوعات")}${stat("—","حجوزات مكتملة")}${stat("—","حجوزات قادمة")}</div><section class="section"><div class="row"><h2>الملاعب المتاحة</h2><button class="btn outline" onclick="go('fields')">عرض الكل</button></div><div class="grid3">${state.fields.slice(0,3).map(card).join("")||"<p>لا توجد ملاعب بعد.</p>"}</div></section>`)}
function fieldsPage(){return shell(`<h1 class="title">الملاعب المتاحة</h1><section class="section"><div class="toolbar"><input id="search" class="input" placeholder="ابحث عن ملعب..." oninput="filterFields()"><select id="typeFilter" onchange="filterFields()"><option value="">جميع الأنواع</option><option>خارجي</option><option>داخلي</option></select></div><div id="fieldList" class="list">${fieldRows(state.fields)}</div></section>`)}
function fieldRows(arr){return arr.map(f=>`<div class="listrow"><img src="${esc(f.image_url)}"><div><b>${esc(f.field_name)}</b><p class="muted">النوع: ${esc(f.field_type)} | الموقع: ${esc(f.location)}</p></div><b class="price">${money(f.price)} / ساعة</b><button class="btn primary" onclick="selectField(${f.field_id})">احجز الآن</button></div>`).join("")||"<p>لا توجد نتائج.</p>"}
function filterFields(){const q=document.querySelector("#search").value.toLowerCase(),t=document.querySelector("#typeFilter").value;document.querySelector("#fieldList").innerHTML=fieldRows(state.fields.filter(f=>(f.field_name.toLowerCase().includes(q)||f.location.toLowerCase().includes(q))&&(!t||f.field_type===t)))}
function booking(){const f=state.field;if(!f)return fieldsPage();return shell(`<h1 class="title">شاشة اختيار التاريخ والوقت</h1><div class="calendarLayout"><section class="section"><img class="fieldimg" src="${esc(f.image_url)}"><div class="info"><div><b>الموقع</b><span>${esc(f.location)}</span></div><div><b>النوع</b><span>${esc(f.field_type)}</span></div><div><b>السعر</b><span class="price">${money(f.price)} / ساعة</span></div></div></section><section class="section"><h2>حجز ${esc(f.field_name)}</h2><label>اختر التاريخ</label><input id="bookDate" class="input" type="date" min="${new Date().toISOString().slice(0,10)}" value="${state.date}" onchange="state.date=this.value">
<div class="times"><div><label>وقت البداية</label><input id="start" class="input" type="time" value="${state.start}" onchange="state.start=this.value"></div><div><label>وقت النهاية</label><input id="end" class="input" type="time" value="${state.end}" onchange="state.end=this.value"></div></div>
<button class="btn primary full" style="margin-top:18px" onclick="checkAvailability()">تحقق من التوفر</button></section></div>`)}
async function checkAvailability(){
 state.date=document.querySelector("#bookDate").value;state.start=document.querySelector("#start").value;state.end=document.querySelector("#end").value;
 if(state.end<=state.start)return alert("وقت النهاية يجب أن يكون بعد البداية");
 const {data,error}=await sb.from("bookings").select("booking_id").eq("field_id",state.field.field_id).eq("booking_date",state.date).neq("booking_status","Cancelled").lt("start_time",state.end).gt("end_time",state.start);
 if(error)return alert(error.message);
 state.available=!data.length;go("availability")
}
function availability(){const f=state.field,total=((new Date(`1970-01-01T${state.end}`)-new Date(`1970-01-01T${state.start}`))/3600000)*Number(f.price);return shell(`<h1 class="title">شاشة التحقق من التوفر</h1><section class="section"><div class="alert ${state.available?"":"bad"}">${state.available?"✓":"✕"}<h2>${state.available?"رائع! الملعب متاح للحجز":"الملعب غير متاح في هذا الوقت"}</h2><b>${state.date}</b><br>${state.start} إلى ${state.end}</div>${state.available?`<section class="section"><h2>ملخص الحجز</h2><div class="info"><div><b>الملعب</b><span>${esc(f.field_name)}</span></div><div><b>السعر</b><span class="price">${money(total)}</span></div></div></section><div class="row"><button class="btn outline" onclick="go('booking')">رجوع</button><button class="btn primary" onclick="go('payment')">تأكيد الحجز</button></div>`:`<button class="btn outline" onclick="go('booking')">اختيار وقت آخر</button>`}</section>`)}
async function createBooking(){
 const f=state.field,total=((new Date(`1970-01-01T${state.end}`)-new Date(`1970-01-01T${state.start}`))/3600000)*Number(f.price);
 const {data:b,error}=await sb.from("bookings").insert({customer_id:state.user.id,field_id:f.field_id,booking_date:state.date,start_time:state.start,end_time:state.end,booking_status:"Confirmed"}).select().single();
 if(error){alert(error.message);return}
 const {error:pe}=await sb.from("payments").insert({booking_id:b.booking_id,amount:total,payment_method:state.pay,payment_status:"Paid"});
 if(pe){await sb.from("bookings").update({booking_status:"Pending"}).eq("booking_id",b.booking_id);alert(pe.message);return}
 state.lastBooking=b;go("success")
}
function payment(){const f=state.field;return shell(`<h1 class="title">شاشة الدفع</h1><div class="payment"><section class="section"><h2>ملخص الحجز</h2><div class="info"><div><b>الملعب</b><span>${esc(f.field_name)}</span></div><div><b>التاريخ</b><span>${state.date}</span></div><div><b>الوقت</b><span>${state.start} إلى ${state.end}</span></div></div></section><section class="section"><h2>طريقة الدفع</h2>${["Card","Cash","Wallet","Vodafone Cash"].map((m,i)=>`<label class="method"><input type="radio" name="pay" ${i===0?"checked":""} onchange="state.pay='${m}'"> ${m}</label>`).join("")}</section></div><section class="section"><div class="alert">🔒 واجهة دفع تجريبية للمشروع — يتم حفظ عملية الدفع في جدول PAYMENT.</div><button class="btn primary full" onclick="createBooking()">إتمام الدفع</button></section>`)}
function success(){return shell(`<h1 class="title">شاشة تأكيد الحجز</h1><section class="section success"><div class="check">✓</div><h1 class="price">تم تأكيد الحجز بنجاح!</h1><p>تم حفظ الحجز والدفع في قاعدة البيانات.</p><div class="row"><button class="btn outline" onclick="go('dashboard')">العودة إلى الرئيسية</button><button class="btn primary" onclick="go('bookings')">عرض حجوزاتي</button></div></section>`)}
async function bookings(){
 const {data,error}=await sb.from("bookings").select("booking_id,booking_date,start_time,end_time,booking_status,sports_fields(field_name,price)").eq("customer_id",state.user.id).order("booking_date",{ascending:false});
 if(error)return shell(`<section class="section"><p>${esc(error.message)}</p></section>`);
 return shell(`<h1 class="title">حجوزاتي</h1><section class="section"><div style="overflow:auto"><table class="table"><tr><th>رقم الحجز</th><th>الملعب</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th></tr>${(data||[]).map(b=>`<tr><td>${b.booking_id}</td><td>${esc(b.sports_fields?.field_name)}</td><td>${b.booking_date}</td><td>${b.start_time} - ${b.end_time}</td><td><span class="badge ok">${b.booking_status}</span></td></tr>`).join("")||"<tr><td colspan='5'>لا توجد حجوزات.</td></tr>"}</table></div></section>`)
}
async function profile(){
 return shell(`<h1 class="title">الملف الشخصي</h1><section class="section"><h2>بيانات الحساب</h2><p><b>الاسم:</b> ${esc(state.profile?.full_name)}</p><p><b>البريد:</b> ${esc(state.user.email)}</p><p><b>الهاتف:</b> ${esc(state.profile?.phone||"غير مضاف")}</p></section>`)
}
async function render(){
 if(!configured()){app.innerHTML=auth("login").replace('<div id="msg" class="notice hide"></div>','<div id="msg" class="notice error">ضع بيانات Supabase في config.js</div>');return}
 if(state.page==="login"){app.innerHTML=auth("login");return}
 if(state.page==="signup"){app.innerHTML=auth("signup");return}
 if(!state.user){state.page="login";app.innerHTML=auth("login");return}
 if(state.page==="dashboard")app.innerHTML=dashboard();
 else if(state.page==="fields")app.innerHTML=fieldsPage();
 else if(state.page==="booking")app.innerHTML=booking();
 else if(state.page==="availability")app.innerHTML=availability();
 else if(state.page==="payment")app.innerHTML=payment();
 else if(state.page==="success")app.innerHTML=success();
 else if(state.page==="bookings")app.innerHTML=await bookings();
 else if(state.page==="profile")app.innerHTML=await profile();
 else app.innerHTML=dashboard();
}
init();
