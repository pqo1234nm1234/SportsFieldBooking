const {createClient}=window.supabase;
const configured=()=>!window.SUPABASE_URL.includes("PUT_YOUR")&&!window.SUPABASE_ANON_KEY.includes("PUT_YOUR");
const db=()=>createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);

let sb=null,state={
  page:"login",
  user:null,
  profile:null,
  fields:[],
  field:null,
  date:new Date().toISOString().slice(0,10),
  start:"",
  end:"",
  pay:"Card",
  available:null,
  manager:false
};

const app=document.querySelector("#app");

const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#039;"
}[c]));

const money=x=>`${Number(x||0).toFixed(2)} ج.م`;

function note(t,ok=false){
  const e=document.querySelector("#msg");
  if(e){
    e.textContent=t;
    e.className="notice "+(ok?"success":"error");
  }
}

function go(p){
  state.page=p;
  render();
}

async function init(){
  if(!configured()){
    render();
    return;
  }

  sb=db();

  const {data}=await sb.auth.getSession();

  state.user=data.session?.user||null;

  if(state.user)
    await loadProfile();

  sb.auth.onAuthStateChange(async(_e,session)=>{
    state.user=session?.user||null;

    if(state.user){
      await loadProfile();

      if(state.page==="login"||state.page==="signup")
        state.page="dashboard";
    }

    render();
  });

  render();

  if(state.user)
    await loadFields();
}

async function loadProfile(){
  const {data}=await sb
    .from("profiles")
    .select("*")
    .eq("id",state.user.id)
    .maybeSingle();

  state.profile=data||{
    full_name:state.user.user_metadata?.full_name||state.user.email
  };
}

async function loadFields(){
  const {data,error}=await sb
    .from("sports_fields")
    .select("*")
    .order("field_id");

  if(!error)
    state.fields=data||[];

  if(!state.field&&state.fields.length)
    state.field=state.fields[0];
}

async function signup(){
  const name=document.querySelector("#name").value.trim();
  const email=document.querySelector("#email").value.trim();
  const pass=document.querySelector("#pass").value;
  const confirm=document.querySelector("#confirm").value;

  if(!name||!email||!pass)
    return note("املأ كل البيانات");

  if(pass.length<6)
    return note("كلمة المرور يجب أن تكون 6 أحرف على الأقل");

  if(pass!==confirm)
    return note("تأكيد كلمة المرور غير مطابق");

  const {data,error}=await sb.auth.signUp({
  email,
  password:pass,
  options:{
    data:{
      full_name:name
    },
    emailRedirectTo:"https://pqo1234nm1234.github.io/SportsFieldBooking/"
  }
});

  if(error)
    return note(error.message);
  if(data.user && data.user.identities && data.user.identities.length === 0)
  return note("هذا الحساب موجود بالفعل");


  if(data.session){
    state.user=data.user;
    await loadProfile();
    await loadFields();
    go("dashboard");
  }else{
    note(
      "تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيد الحساب ثم سجل الدخول.",
      true
    );
  }
}

async function login(){
  const email=document.querySelector("#email").value.trim();
  const pass=document.querySelector("#pass").value;

  const {data,error}=await sb.auth.signInWithPassword({
    email,
    password:pass
  });

  if(error)
    return note(error.message);

  state.user=data.user;

await loadProfile();
await loadFields();

if(state.profile?.role==="manager"){
  state.manager=true;
  go("manager");
}else{
  state.manager=false;
  go("dashboard");
}
}

async function logout(){
  await sb.auth.signOut();

  state.user=null;
  state.profile=null;
  state.page="login";

  render();
}

function auth(mode){
  const sign=mode==="signup";

  return `
    <div class="login">
      <div class="hero">
        <div>
          <h1>نظام حجز الملاعب الرياضية</h1>
          <p>احجز ملعبك في أي وقت ومن أي مكان</p>
        </div>
      </div>

      <div class="loginform">
        <div class="form">

          <h1>${sign?"إنشاء حساب جديد":"مرحباً بعودتك"}</h1>

          <p class="muted">
            ${sign?"أنشئ حسابك لبدء الحجز":"سجل الدخول للوصول إلى حسابك"}
          </p>

          <div id="msg" class="notice hide"></div>

          ${
            sign
            ? `<label>الاسم الكامل</label>
               <input id="name" class="input" placeholder="أدخل اسمك الكامل">`
            : ""
          }

          <label>البريد الإلكتروني</label>

          <input
            id="email"
            class="input"
            type="email"
            placeholder="example@email.com"
          >

          <label>كلمة المرور</label>

          <input
            id="pass"
            class="input"
            type="password"
            placeholder="أدخل كلمة المرور"
          >

          ${
            sign
            ? `<label>تأكيد كلمة المرور</label>
               <input id="confirm" class="input" type="password" placeholder="أعد كتابة كلمة المرور">`
            : ""
          }

          <button
            class="btn primary full"
            onclick="${sign?"signup()":"login()"}"
          >
            ${sign?"إنشاء الحساب":"تسجيل الدخول"}
          </button>

          <p>
            ${sign?"لديك حساب بالفعل؟":"ليس لديك حساب؟"}
            <b
              class="link"
              onclick="go('${sign?"login":"signup"}')"
            >
              ${sign?"تسجيل الدخول":"إنشاء حساب جديد"}
            </b>
          </p>

        </div>
      </div>
    </div>
  `;
}

function side(){

  const isManager = state.profile?.role === "manager";

  /* =========================
     MANAGER SIDEBAR
     ========================= */
  if(isManager){
    return `
      <aside class="side">

        <div class="brand">
          <span class="ball">⚽</span>
          <span>نظام حجز الملاعب</span>
        </div>

        <nav class="nav">

          <button class="${state.page==="manager" ? "active" : ""}"
            onclick="go('manager')">
            🏠 لوحة المدير
          </button>

          <button class="${state.page==="bookings" ? "active" : ""}"
            onclick="go('bookings')">
            📅 الحجوزات
          </button>

          <button class="${state.page==="fields" ? "active" : ""}"
            onclick="go('fields')">
            ⚽ الملاعب
          </button>

          <button class="${state.page==="profile" ? "active" : ""}"
            onclick="go('profile')">
            👥 العملاء
          </button>

          <button onclick="logout()">
            🚪 تسجيل الخروج
          </button>

        </nav>

      </aside>
    `;
  }

  /* =========================
     CUSTOMER SIDEBAR
     ========================= */
  return `
    <aside class="side">

      <div class="brand">
        <span class="ball">⚽</span>
        <span>نظام حجز الملاعب</span>
      </div>

      <nav class="nav">

        <button class="${state.page==="dashboard" ? "active" : ""}"
          onclick="go('dashboard')">
          🏠 الرئيسية
        </button>

        <button class="${state.page==="fields" ? "active" : ""}"
          onclick="go('fields')">
          ⚽ الملاعب
        </button>

        <button class="${state.page==="bookings" ? "active" : ""}"
          onclick="go('bookings')">
          📅 حجوزاتي
        </button>

      <button class="${state.page==="paymentMethods" ? "active" : ""}"
  onclick="go('paymentMethods')">
  💳 وسائل الدفع
</button>

        <button class="${state.page==="profile" ? "active" : ""}"
          onclick="go('profile')">
          👤 الملف الشخصي
        </button>

        <button onclick="logout()">
          🚪 تسجيل الخروج
        </button>

      </nav>

    </aside>
  `;
}

function shell(body){
  return `
    <header class="top">
      <span>نظام حجز الملاعب الرياضية</span>

      <span>
        مرحباً ${esc(
          state.profile?.full_name||
          state.user?.email||
          ""
        )}
      </span>
    </header>

    <div class="layout">
      ${side()}

      <main class="content">
        ${body}
      </main>
    </div>
  `;
}

function stat(n,t){
  return `
    <div class="stat">
      <div class="num">${esc(n)}</div>
      <div>${t}</div>
    </div>
  `;
}

function card(f){
  return `
    <article class="card">

      <img src="${esc(f.image_url)}">

      <div class="cardbody">

        <h3>${esc(f.field_name)}</h3>

        <p class="muted">
          ${esc(f.field_type)}
        </p>

        <div class="row">

          <b class="price">
            ${money(f.price)} / ساعة
          </b>

          <button
            class="btn primary"
            onclick="selectField(${f.field_id})"
          >
            احجز الآن
          </button>

        </div>

      </div>

    </article>
  `;
}

async function selectField(id){
  state.field=state.fields.find(x=>x.field_id===id);
  go("booking");
}


/* =========================
   DASHBOARD
========================= */

async function dashboard(){

  /* =========================
     GET USER BOOKINGS
     ========================= */
  const { data: bookingsData } = await sb
    .from("bookings")
    .select(`
      booking_id,
      booking_date,
      start_time,
      end_time,
      booking_status,
      sports_fields (
        field_name,
        price
      )
    `)
    .eq("customer_id", state.user.id)
    .order("booking_date", { ascending: false });

  const bookings = bookingsData || [];

  /* =========================
     STATISTICS
     ========================= */

  const upcoming = bookings.filter(
    b => b.booking_status === "Confirmed"
  ).length;

  const completed = bookings.filter(
    b => b.booking_status === "Completed"
  ).length;

  const pending = bookings.filter(
    b => b.booking_status === "Pending"
  ).length;

  const totalPaid = bookings
    .filter(b =>
      b.booking_status === "Confirmed" ||
      b.booking_status === "Completed"
    )
    .reduce(
      (sum, b) => sum + Number(b.sports_fields?.price || 0),
      0
    );

  /* =========================
     GET SPORTS FIELDS
     ========================= */

  const { data: fieldsData } = await sb
    .from("sports_fields")
    .select("*");

  const fields = fieldsData || [];

  /* =========================
     FIELD IMAGE
     ========================= */

  function fieldImage(field){

    const name = String(
      field.field_name ||
      field.name ||
      ""
    ).toLowerCase();

    /* لو عندك رابط صورة في قاعدة البيانات */
    if(field.image_url) return field.image_url;
    if(field.image) return field.image;
    if(field.photo_url) return field.photo_url;
    if(field.image_path) return field.image_path;

    /* صور افتراضية */
    if(name.includes("قدم") || name.includes("football")){
      return "assets/football.jpg";
    }

    if(name.includes("سلة") || name.includes("basket")){
      return "assets/basketball.jpg";
    }

    if(name.includes("تنس") || name.includes("tennis")){
      return "assets/tennis.jpg";
    }

    return "assets/football.jpg";
  }

  /* =========================
     FIELD CARD
     ========================= */

  function fieldCard(field){

    const fieldName =
      field.field_name ||
      field.name ||
      "ملعب";

    const type =
      field.field_type ||
      field.type ||
      "خارجي";

    const price =
      Number(field.price || 0).toFixed(0);

    return `
      <div class="field-card">

        <div class="field-image">
          <img
            src="${fieldImage(field)}"
            alt="${esc(fieldName)}"
            onerror="this.src='assets/football.jpg'"
          >
        </div>

        <div class="field-card-body">

          <h3>
            ${esc(fieldName)}
          </h3>

          <p class="field-type">
            ${esc(type)}
          </p>

          <div class="field-bottom">

            <strong>
              ${price} ج.م / ساعة
            </strong>

            <button
              class="book-icon"
              onclick="go('booking')"
              title="احجز الآن">
              📅
            </button>

          </div>

        </div>

      </div>
    `;
  }

  /* =========================
     DASHBOARD
     ========================= */

  return shell(`

    <h1 class="title">
      لوحة تحكم العميل (الرئيسية)
    </h1>

    <section class="customer-welcome">

      <div>
        <h2>
          مرحباً، ${esc(
            state.profile?.full_name ||
            state.user?.email ||
            "عميل"
          )}
        </h2>

        <p>
          ماذا ستلعب اليوم؟
        </p>
      </div>

      <div class="customer-avatar">
        👤
      </div>

    </section>


    <!-- =========================
         STATISTICS
         ========================= -->

    <section class="customer-stats">

      <div class="customer-stat">

        <div class="stat-icon blue">
          📅
        </div>

        <div class="stat-number">
          ${upcoming}
        </div>

        <div class="stat-label">
          حجوزات قادمة
        </div>

      </div>


      <div class="customer-stat">

        <div class="stat-icon green">
          ✓
        </div>

        <div class="stat-number">
          ${completed}
        </div>

        <div class="stat-label">
          حجوزات مكتملة
        </div>

      </div>


      <div class="customer-stat">

        <div class="stat-icon wallet">
          💳
        </div>

        <div class="stat-number">
          ${totalPaid.toFixed(2)} ج.م
        </div>

        <div class="stat-label">
          إجمالي المدفوعات
        </div>

      </div>


      <div class="customer-stat">

        <div class="stat-icon orange">
          🕐
        </div>

        <div class="stat-number">
          ${pending}
        </div>

        <div class="stat-label">
          مدفوعات معلقة
        </div>

      </div>

    </section>


    <!-- =========================
         AVAILABLE FIELDS
         ========================= -->

    <section class="customer-fields-section">

      <div class="section-heading">

        <h2>
          الملاعب المتاحة
        </h2>

        <button
          class="show-all-btn"
          onclick="go('fields')">
          عرض الكل
        </button>

      </div>


      <div class="customer-fields-grid">

        ${
          fields.length
            ? fields.slice(0, 3).map(fieldCard).join("")
            : `
              <div class="empty-fields">
                لا توجد ملاعب متاحة حالياً.
              </div>
            `
        }

      </div>

    </section>

  `);
}

function fieldsPage(){
  return shell(`
    <h1 class="title">
      الملاعب المتاحة
    </h1>

    <section class="section">

      <div class="toolbar">

        <input
          id="search"
          class="input"
          placeholder="ابحث عن ملعب..."
          oninput="filterFields()"
        >

        <select
          id="typeFilter"
          onchange="filterFields()"
        >
          <option value="">جميع الأنواع</option>
          <option>خارجي</option>
          <option>داخلي</option>
        </select>

      </div>

      <div
        id="fieldList"
        class="list"
      >
        ${fieldRows(state.fields)}
      </div>

    </section>
  `);
}
async function managerFieldsPage(){

 const {data:fields,error}=await sb
  .from("sports_fields")
  .select("*")
  .eq("is_deleted", false)
  .order("field_id",{ascending:true});
  if(error){
    return shell(`
      <h1 class="title">إدارة الملاعب</h1>
      <section class="section">
        <p>${esc(error.message)}</p>
      </section>
    `);
  }

  return shell(`

    <h1 class="title">
      إدارة الملاعب
    </h1>

    <section class="section">

      <button
        class="btn primary"
        onclick="
          const box=document.querySelector('#addFieldBox');
          box.style.display =
            box.style.display==='none'
            ? 'block'
            : 'none';
        "
      >
        ➕ إضافة ملعب
        <span style="margin-right:8px">⌄</span>
      </button>

      <div
        id="addFieldBox"
        style="display:none;margin-top:20px"
      >

        <input
          id="newFieldName"
          class="input"
          placeholder="اسم الملعب"
        >

        <select
          id="newFieldType"
          style="margin-top:10px"
        >
          <option value="خارجي">خارجي</option>
          <option value="داخلي">داخلي</option>
        </select>

        <input
          id="newFieldLocation"
          class="input"
          placeholder="موقع الملعب"
          style="margin-top:10px"
        >

        <input
          id="newFieldPrice"
          class="input"
          type="number"
          min="0"
          placeholder="السعر لكل ساعة"
          style="margin-top:10px"
        >

        <input
          id="newFieldImage"
          class="input"
          type="file"
          accept="image/*"
          style="margin-top:10px"
        >

        <button
          class="btn primary"
          onclick="addManagerField()"
          style="margin-top:15px"
        >
          إضافة الملعب
        </button>

      </div>

    </section>

    <section class="section">

      <h2>الملاعب الموجودة</h2>

      <div class="list">

        ${
          fields.length
          ?
          fields.map(f=>`

            <div class="listrow">

              <img
                src="${esc(f.image_url || "")}"
                style="
                  width:110px;
                  height:75px;
                  object-fit:cover;
                  border-radius:10px;
                "
              >

              <div style="flex:1">

                <b>
                  ${esc(f.field_name)}
                </b>

                <p class="muted">
                  النوع: ${esc(f.field_type)}
                  |
                  الموقع: ${esc(f.location)}
                </p>

              </div>

              <b class="price">
  ${money(f.price)} / ساعة
</b>

<button
  class="btn danger"
  onclick="deleteManagerField(${f.field_id})"
  style="margin-right:15px"
>
  🗑️ حذف
</button>
            </div>

          `).join("")

          :

          `<p>لا توجد ملاعب حالياً.</p>`
        }

      </div>

    </section>

  `);
}
async function deleteManagerField(fieldId){

  if(!confirm("هل أنت متأكد من حذف هذا الملعب؟")){
    return;
  }

  // البحث عن الحجوزات الخاصة بالملعب
  const {data:bookings,error:bookingError}=await sb
    .from("bookings")
    .select("booking_date,start_time,end_time,booking_status")
    .eq("field_id",fieldId)
    .neq("booking_status","Cancelled");

  if(bookingError){
    alert(bookingError.message);
    return;
  }

  // معرفة هل يوجد حجز لم ينتهِ بعد
  const now=new Date();

  const activeBooking=bookings?.some(b=>{

    const endDateTime=new Date(
      `${b.booking_date}T${b.end_time}`
    );

    return endDateTime>now;

  });

  // إخفاء الملعب فوراً بدون حذف الحجوزات
  const {error}=await sb
    .from("sports_fields")
    .update({
      is_deleted:true
    })
    .eq("field_id",fieldId);

  if(error){
    alert(error.message);
    return;
  }

  if(activeBooking){

    alert(
      "تم إخفاء الملعب من الموقع.\n\n" +
      "الحجوزات الحالية ستظل موجودة ولن يتم إلغاؤها.\n" +
      "سيتم حذف الملعب نهائياً بعد انتهاء آخر حجز."
    );

  }else{

    alert(
      "تم إخفاء الملعب.\n" +
      "لا توجد حجوزات نشطة حالياً."
    );

  }

  await render();
}

async function addManagerField(){

  const field_name =
    document.querySelector("#newFieldName").value.trim();

  const field_type =
    document.querySelector("#newFieldType").value;

  const location =
    document.querySelector("#newFieldLocation").value.trim();

  const price =
    Number(document.querySelector("#newFieldPrice").value);

  const file =
    document.querySelector("#newFieldImage").files[0];


  if(!field_name || !location || !price || !file){

    alert("من فضلك أكمل بيانات الملعب واختر صورة");
    return;

  }


  /* رفع الصورة */

  const ext =
    file.name.split(".").pop();

  const fileName =
    `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const filePath =
    `fields/${fileName}`;


  const {error:uploadError}=await sb
    .storage
    .from("field-images")
    .upload(filePath,file,{
      contentType:file.type,
      upsert:false
    });


  if(uploadError){

    alert(uploadError.message);
    return;

  }


  /* الحصول على رابط الصورة */

  const {data:urlData}=sb
    .storage
    .from("field-images")
    .getPublicUrl(filePath);


  const image_url =
    urlData.publicUrl;


  /* إضافة بيانات الملعب */

  const {error}=await sb
    .from("sports_fields")
    .insert({
      field_name,
      field_type,
      location,
      price,
      image_url
    });


  if(error){

    alert(error.message);
    return;

  }


  alert("تم إضافة الملعب بنجاح");

  await loadFields();

  state.page="fields";

  await render();

}

function fieldRows(arr){
  return arr.map(f=>`

    <div class="listrow">

      <img src="${esc(f.image_url)}">

      <div>

        <b>
          ${esc(f.field_name)}
        </b>

        <p class="muted">
          النوع:
          ${esc(f.field_type)}
          |
          الموقع:
          ${esc(f.location)}
        </p>

      </div>

      <b class="price">
        ${money(f.price)} / ساعة
      </b>

      <button
        class="btn primary"
        onclick="selectField(${f.field_id})"
      >
        احجز الآن
      </button>

    </div>

  `).join("")||"<p>لا توجد نتائج.</p>";
}

function filterFields(){
  const q=document
    .querySelector("#search")
    .value
    .toLowerCase();

  const t=document
    .querySelector("#typeFilter")
    .value;

  document.querySelector("#fieldList").innerHTML=
    fieldRows(
      state.fields.filter(f=>
        (
          f.field_name
            .toLowerCase()
            .includes(q)
          ||
          f.location
            .toLowerCase()
            .includes(q)
        )
        &&
        (!t||f.field_type===t)
      )
    );
}

function booking(){
  const f=state.field;

  if(!f)
    return fieldsPage();

  return shell(`
    <h1 class="title">
      شاشة اختيار التاريخ والوقت
    </h1>

    <div class="calendarLayout">

      <section class="section">

        <img
          class="fieldimg"
          src="${esc(f.image_url)}"
        >

        <div class="info">

          <div>
            <b>الموقع</b>
            <span>${esc(f.location)}</span>
          </div>

          <div>
            <b>النوع</b>
            <span>${esc(f.field_type)}</span>
          </div>

          <div>
            <b>السعر</b>
            <span class="price">
              ${money(f.price)} / ساعة
            </span>
          </div>

        </div>

      </section>


      <section class="section">

        <h2>
          حجز ${esc(f.field_name)}
        </h2>

        <label>
          اختر التاريخ
        </label>

        <input
          id="bookDate"
          class="input"
          type="date"
          min="${new Date().toISOString().slice(0,10)}"
          value="${state.date}"
          onchange="state.date=this.value"
        >

        <div class="times">

          <div>

            <label>
              وقت البداية
            </label>

           <div class="time-input-wrap">

  <input
    id="start"
    class="input"
    type="time"
    value="${state.start}"
    onchange="state.start=this.value"
  >

</div>
          </div>


          <div>

            <label>
              وقت النهاية
            </label>

           <div class="time-input-wrap">

  <input
    id="end"
    class="input"
    type="time"
    value="${state.end}"
    onchange="state.end=this.value"
  >

</div>
          </div>

        </div>

        <button
          class="btn primary full"
          style="margin-top:18px"
          onclick="checkAvailability()"
        >
          تحقق من التوفر
        </button>

      </section>

    </div>
  `);
}

async function checkAvailability(){

  state.date=document.querySelector("#bookDate").value;
  state.start=document.querySelector("#start").value;
  state.end=document.querySelector("#end").value;

  if(state.end<=state.start)
    return alert("وقت النهاية يجب أن يكون بعد البداية");

  const {data,error}=await sb
    .from("bookings")
    .select("booking_id")
    .eq("field_id",state.field.field_id)
    .eq("booking_date",state.date)
    .neq("booking_status","Cancelled")
    .lt("start_time",state.end)
    .gt("end_time",state.start);

  if(error)
    return alert(error.message);

  state.available=!data.length;

  go("availability");
}

function availability(){

  const f=state.field;

  const total=(
    (
      new Date(`1970-01-01T${state.end}`)
      -
      new Date(`1970-01-01T${state.start}`)
    )/3600000
  )*Number(f.price);

  return shell(`

    <h1 class="title">
      شاشة التحقق من التوفر
    </h1>

    <section class="section">

      <div class="alert ${state.available?"":"bad"}">

        ${state.available?"✓":"✕"}

        <h2>
          ${
            state.available
            ?
            "رائع! الملعب متاح للحجز"
            :
            "الملعب غير متاح في هذا الوقت"
          }
        </h2>

        <b>${state.date}</b>

        <br>

        ${state.start} إلى ${state.end}

      </div>

      ${
        state.available
        ?
        `
          <section class="section">

            <h2>
              ملخص الحجز
            </h2>

            <div class="info">

              <div>
                <b>الملعب</b>
                <span>${esc(f.field_name)}</span>
              </div>

              <div>
                <b>السعر</b>
                <span class="price">
                  ${money(total)}
                </span>
              </div>

            </div>

          </section>

          <div class="row">

            <button
              class="btn outline"
              onclick="go('booking')"
            >
              رجوع
            </button>

            <button
              class="btn primary"
              onclick="go('payment')"
            >
              تأكيد الحجز
            </button>

          </div>
        `
        :
        `
          <button
            class="btn outline"
            onclick="go('booking')"
          >
            اختيار وقت آخر
          </button>
        `
      }

    </section>
  `);
}

async function createBooking(){

  const f=state.field;

  const total=(
    (
      new Date(`1970-01-01T${state.end}`)
      -
      new Date(`1970-01-01T${state.start}`)
    )/3600000
  )*Number(f.price);

  const {data:b,error}=await sb
    .from("bookings")
    .insert({
      customer_id:state.user.id,
      field_id:f.field_id,
      booking_date:state.date,
      start_time:state.start,
      end_time:state.end,
      booking_status:"Confirmed"
    })
    .select()
    .single();

  if(error){
    alert(error.message);
    return;
  }

  const {error:pe}=await sb
    .from("payments")
    .insert({
      booking_id:b.booking_id,
      amount:total,
      payment_method:state.pay,
      payment_status:"Paid"
    });

  if(pe){

    await sb
      .from("bookings")
      .update({booking_status:"Pending"})
      .eq("booking_id",b.booking_id);

    alert(pe.message);
    return;
  }

  state.lastBooking=b;

  go("success");
}

async function payment(){

  const f = state.field;

  const { data: methods, error } = await sb
    .from("user_payment_methods")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending:false });

  if(error){
    return shell(`
      <h1 class="title">شاشة الدفع</h1>

      <section class="section">
        <p class="notice error">
          ${esc(error.message)}
        </p>
      </section>
    `);
  }

  const paymentMethods = methods || [];

  if(paymentMethods.length === 0){

    return shell(`

      <h1 class="title">
        شاشة الدفع
      </h1>

      <section class="section">

        <h2>
          لا توجد وسيلة دفع محفوظة
        </h2>

        <p class="muted">
          أضف وسيلة دفع من صفحة "وسائل الدفع" أولاً.
        </p>

        <button
          class="btn primary"
          onclick="go('paymentMethods')"
        >
          + إضافة وسيلة دفع
        </button>

      </section>

    `);
  }

  state.pay = paymentMethods[0].method_name;

  return shell(`

    <h1 class="title">
      شاشة الدفع
    </h1>

    <div class="payment">

      <section class="section">

        <h2>
          ملخص الحجز
        </h2>

        <div class="info">

          <div>
            <b>الملعب</b>
            <span>${esc(f.field_name)}</span>
          </div>

          <div>
            <b>التاريخ</b>
            <span>${esc(state.date)}</span>
          </div>

          <div>
            <b>الوقت</b>
            <span>
              ${esc(state.start)} إلى ${esc(state.end)}
            </span>
          </div>

        </div>

      </section>


      <section class="section">

        <h2>
          اختر وسيلة الدفع
        </h2>

        ${
          paymentMethods.map((m,i)=>`

            <label
              class="method"
              style="
                display:flex;
                align-items:center;
                gap:12px;
                cursor:pointer;
              "
            >

              <input
                type="radio"
                name="pay"
                value="${esc(m.method_name)}"
                ${i===0 ? "checked" : ""}
                onchange="
                  state.pay=this.value;
                  state.paymentMethodId=${Number(m.id)};
                "
              >

              <span>
                <b>${esc(m.method_name)}</b>
                <small style="
                  display:block;
                  color:#777;
                  margin-top:4px;
                ">
                  ${
  (() => {
    try {
      const d = JSON.parse(m.payment_details || "{}");

      if(m.method_name === "Visa"){
        return `
          •••• ${esc(d.card_last4 || "")}
          ${
            d.expiry
              ? ` — انتهاء ${esc(d.expiry)}`
              : ""
          }
        `;
      }

      if(m.method_name === "Wallet"){
        return esc(d.wallet_number || "");
      }

      return esc(m.payment_details);

    } catch(e) {
      return esc(m.payment_details);
    }
  })()
}
                </small>
              </span>

            </label>

          `).join("")
        }

        <button
          class="btn outline"
          style="margin-top:15px"
          onclick="go('paymentMethods')"
        >
          إدارة وسائل الدفع
        </button>

      </section>

    </div>


    <section class="section">

      <div class="alert">
        🔒 سيتم استخدام وسيلة الدفع التي اخترتها وإتمام الحجز.
      </div>

      <button
        class="btn primary full"
        onclick="createBooking()"
      >
        إتمام الدفع
      </button>

    </section>

  `);
}
function success(){

  return shell(`

    <h1 class="title">
      شاشة تأكيد الحجز
    </h1>

    <section class="section success">

      <div class="check">
        ✓
      </div>

      <h1 class="price">
        تم تأكيد الحجز بنجاح!
      </h1>

      <p>
        تم حفظ الحجز والدفع في قاعدة البيانات.
      </p>

      <div class="row">

        <button
          class="btn outline"
          onclick="go('dashboard')"
        >
          العودة إلى الرئيسية
        </button>

        <button
          class="btn primary"
          onclick="go('bookings')"
        >
          عرض حجوزاتي
        </button>

      </div>

    </section>
  `);
}

async function managerDashboard(){

  if(state.profile?.role!=="manager"){
    state.page="dashboard";
    return dashboard();
  }

  const {data:rows,error}=await sb
    .from("bookings")
    .select(`
      booking_id,
      customer_id,
      booking_date,
      start_time,
      end_time,
      booking_status,
      sports_fields(field_name,price)
    `)
    .order("booking_date",{ascending:false});

  if(error){
    return shell(`
      <h1 class="title">لوحة المدير</h1>
      <section class="section">
        <p>${esc(error.message)}</p>
      </section>
    `);
  }

  const bookings=rows||[];

  const confirmed=bookings.filter(
    b=>b.booking_status==="Confirmed"
  ).length;

  const pending=bookings.filter(
    b=>b.booking_status==="Pending"
  ).length;

  const cancelled=bookings.filter(
    b=>b.booking_status==="Cancelled"
  ).length;

  const fieldMap={};

  bookings.forEach(b=>{
    const name=b.sports_fields?.field_name||"غير محدد";
    fieldMap[name]=(fieldMap[name]||0)+1;
  });

  const topFields=Object.entries(fieldMap)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);

  const max=Math.max(
    ...topFields.map(x=>x[1]),
    1
  );

  return shell(`

    <h1 class="title">
      لوحة تحكم المدير
    </h1>

    <div class="grid4">

      ${stat(
        bookings.length,
        "إجمالي الحجوزات"
      )}

      ${stat(
        confirmed,
        "حجوزات مؤكدة"
      )}

      ${stat(
        pending,
        "حجوزات معلقة"
      )}

      ${stat(
        cancelled,
        "حجوزات ملغاة"
      )}

    </div>

    <div
      class="grid2"
      style="margin-top:18px"
    >

      <section class="section">

        <h2>
          أكثر الملاعب حجزاً
        </h2>

        ${
          topFields.length
          ?
          topFields.map(([name,count],i)=>`

            <div style="margin-top:20px">

              <div style="
                display:flex;
                justify-content:space-between;
                margin-bottom:7px;
              ">

                <b>
                  ${i+1}.
                  ${esc(name)}
                </b>

                <span>
                  ${count}
                </span>

              </div>

              <div style="
                height:10px;
                background:#eee;
                border-radius:10px;
                overflow:hidden;
              ">

                <div style="
                  width:${(count/max)*100}%;
                  height:100%;
                  background:#27ae60;
                "></div>

              </div>

            </div>

          `).join("")
          :
          `<p class="muted">لا توجد حجوزات.</p>`
        }

      </section>

      <section class="section">

        <h2>
          أحدث الحجوزات
        </h2>

        <div style="overflow:auto">

          <table class="table">

            <tr>
              <th>رقم الحجز</th>
              <th>الملعب</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>الحالة</th>
            </tr>

            ${
              bookings.slice(0,8).map(b=>`

                <tr>

                  <td>
                    BK${String(
                      b.booking_id
                    ).padStart(6,"0")}
                  </td>

                  <td>
                    ${esc(
                      b.sports_fields?.field_name||
                      "غير محدد"
                    )}
                  </td>

                  <td>
                    ${b.booking_date}
                  </td>

                  <td>
                    ${b.start_time} -
                    ${b.end_time}
                  </td>

                  <td>
                    ${
                      b.booking_status==="Confirmed"
                      ?
                      `<span class="badge ok">مؤكد</span>`
                      :
                      b.booking_status==="Pending"
                      ?
                      `<span class="badge">معلق</span>`
                      :
                      `<span class="badge">ملغي</span>`
                    }
                  </td>

                </tr>

              `).join("")
              ||
              `<tr>
                <td colspan="5">
                  لا توجد حجوزات.
                </td>
              </tr>`
            }

          </table>

        </div>

      </section>

    </div>

  `);
}
async function customerDashboard(){

  /* =========================
     بيانات حجوزات العميل
     ========================= */

  const { data: bookingsData, error: bookingsError } = await sb
    .from("bookings")
    .select(`
      booking_id,
      booking_date,
      start_time,
      end_time,
      booking_status,
      sports_fields (
        field_name,
        field_type,
        price,
        image_url
      )
    `)
    .eq("customer_id", state.user.id)
    .order("booking_date", { ascending: false });

  if(bookingsError){
    return shell(`
      <h1 class="title">الرئيسية</h1>
      <section class="section">
        <p>${esc(bookingsError.message)}</p>
      </section>
    `);
  }

  const bookings = bookingsData || [];


  /* =========================
     الإحصائيات
     ========================= */

  const upcoming = bookings.filter(b =>
    b.booking_status === "Confirmed"
  ).length;

  const completed = bookings.filter(b =>
    b.booking_status === "Completed"
  ).length;

  const pending = bookings.filter(b =>
    b.booking_status === "Pending"
  ).length;

  const totalPaid = bookings
    .filter(b =>
      b.booking_status === "Confirmed" ||
      b.booking_status === "Completed"
    )
    .reduce(
      (sum, b) => sum + Number(b.sports_fields?.price || 0),
      0
    );


  /* =========================
     الملاعب
     ========================= */

  const { data: fieldsData, error: fieldsError } = await sb
    .from("sports_fields")
    .select("*")
    .order("field_id", { ascending: true });

  if(fieldsError){
    return shell(`
      <h1 class="title">الرئيسية</h1>
      <section class="section">
        <p>${esc(fieldsError.message)}</p>
      </section>
    `);
  }

  const fields = fieldsData || [];


  /* =========================
     صورة الملعب
     ========================= */

  function fieldImage(field){

    if(field.image_url)
      return field.image_url;

    if(field.image)
      return field.image;

    if(field.photo_url)
      return field.photo_url;

    const name = String(
      field.field_name ||
      field.name ||
      ""
    ).toLowerCase();

    if(
      name.includes("قدم") ||
      name.includes("football")
    ){
      return "assets/football.jpg";
    }

    if(
      name.includes("سلة") ||
      name.includes("basket")
    ){
      return "assets/basketball.jpg";
    }

    if(
      name.includes("تنس") ||
      name.includes("tennis")
    ){
      return "assets/tennis.jpg";
    }

    return "assets/football.jpg";
  }


  /* =========================
     كارت الملعب
     ========================= */

  function customerFieldCard(field){

    const fieldName =
      field.field_name ||
      field.name ||
      "ملعب";

    const fieldType =
      field.field_type ||
      field.type ||
      "خارجي";

    const price =
      Number(field.price || 0).toFixed(0);

    return `
      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,.04);
      ">

        <!-- صورة الملعب -->
        <div style="
          width:100%;
          height:170px;
          overflow:hidden;
        ">
          <img
            src="${esc(fieldImage(field))}"
            alt="${esc(fieldName)}"
            style="
              width:100%;
              height:100%;
              object-fit:cover;
              display:block;
            "
            onerror="this.src='assets/football.jpg'"
          >
        </div>


        <!-- بيانات الملعب -->
        <div style="
          padding:15px 18px 18px;
        ">

          <h3 style="
            margin:0 0 7px;
            font-size:19px;
            font-weight:700;
          ">
            ${esc(fieldName)}
          </h3>


          <p style="
            margin:0 0 18px;
            color:#777;
            font-size:15px;
          ">
            ${esc(fieldType)}
          </p>


          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
          ">

            <strong style="
              color:#159447;
              font-size:16px;
            ">
              ${price} ج.م / ساعة
            </strong>


            <button
              onclick="
                state.field=state.fields.find(
                  x=>x.field_id===${Number(field.field_id)}
                );
                go('booking');
              "
              style="
                border:0;
                background:#fff;
                font-size:24px;
                cursor:pointer;
                padding:4px 8px;
              "
              title="احجز الآن"
            >
              📅
            </button>

          </div>

        </div>

      </div>
    `;
  }


  /* =========================
     الرئيسية الجديدة
     ========================= */

  return shell(`

    <h1 class="title">
      لوحة تحكم العميل (الرئيسية)
    </h1>


    <!-- =========================
         WELCOME
         ========================= -->

    <section style="
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:22px 28px;
      margin-bottom:22px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      direction:rtl;
    ">

      <div>

        <h2 style="
          margin:0 0 8px;
          font-size:22px;
        ">
          مرحباً، ${esc(
            state.profile?.full_name ||
            state.user?.email ||
            "عميل"
          )}
        </h2>

        <p style="
          margin:0;
          color:#777;
        ">
          ماذا ستلعب اليوم؟
        </p>

      </div>


      <div style="
        width:58px;
        height:58px;
        border-radius:50%;
        background:#eef2f5;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:32px;
      ">
        👤
      </div>

    </section>


    <!-- =========================
         STATISTICS
         ========================= -->

    <section style="
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:18px;
      margin-bottom:30px;
      direction:rtl;
    ">


      <!-- مدفوعات معلقة -->

      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        text-align:center;
      ">

        <div style="
          font-size:30px;
          margin-bottom:8px;
        ">
          🕐
        </div>

        <div style="
          color:#e39a00;
          font-size:25px;
          font-weight:700;
        ">
          ${pending}
        </div>

        <div style="
          margin-top:6px;
          font-size:15px;
        ">
          مدفوعات معلقة
        </div>

      </div>


      <!-- إجمالي المدفوعات -->

      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        text-align:center;
      ">

        <div style="
          font-size:30px;
          margin-bottom:8px;
        ">
          💳
        </div>

        <div style="
          color:#159447;
          font-size:25px;
          font-weight:700;
        ">
          ${totalPaid.toFixed(2)} ج.م
        </div>

        <div style="
          margin-top:6px;
          font-size:15px;
        ">
          إجمالي المدفوعات
        </div>

      </div>


      <!-- حجوزات مكتملة -->

      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        text-align:center;
      ">

        <div style="
          font-size:30px;
          margin-bottom:8px;
        ">
          ✓
        </div>

        <div style="
          color:#159447;
          font-size:25px;
          font-weight:700;
        ">
          ${completed}
        </div>

        <div style="
          margin-top:6px;
          font-size:15px;
        ">
          حجوزات مكتملة
        </div>

      </div>


      <!-- حجوزات قادمة -->

      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:20px;
        text-align:center;
      ">

        <div style="
          font-size:30px;
          margin-bottom:8px;
        ">
          📅
        </div>

        <div style="
          color:#1769d1;
          font-size:25px;
          font-weight:700;
        ">
          ${upcoming}
        </div>

        <div style="
          margin-top:6px;
          font-size:15px;
        ">
          حجوزات قادمة
        </div>

      </div>

    </section>


    <!-- =========================
         AVAILABLE FIELDS
         ========================= -->

    <section style="
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:16px;
      padding:24px;
      direction:rtl;
    ">


      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
      ">

        <h2 style="
          margin:0;
          font-size:24px;
        ">
          الملاعب المتاحة
        </h2>


        <button
          onclick="go('fields')"
          style="
            border:0;
            background:transparent;
            color:#159447;
            font-weight:700;
            font-size:16px;
            cursor:pointer;
          "
        >
          عرض الكل
        </button>

      </div>


      <div style="
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:22px;
      ">

        ${
          fields.length
          ?
          fields
            .slice(0,3)
            .map(customerFieldCard)
            .join("")
          :
          `
            <div style="
              grid-column:1/-1;
              text-align:center;
              padding:40px;
              color:#777;
            ">
              لا توجد ملاعب متاحة حالياً.
            </div>
          `
        }

      </div>

    </section>

  `);
}




async function bookings(){

  const {data,error}=await sb
    .from("bookings")
    .select(
      "booking_id,booking_date,start_time,end_time,booking_status,sports_fields(field_name,price)"
    )
    .eq("customer_id",state.user.id)
    .order("booking_date",{ascending:false});

  if(error)
    return shell(`
      <section class="section">
        <p>${esc(error.message)}</p>
      </section>
    `);

  return shell(`

    <h1 class="title">
      حجوزاتي
    </h1>

    <section class="section">

      <div style="overflow:auto">

        <table class="table">

          <tr>
            <th>رقم الحجز</th>
            <th>الملعب</th>
            <th>التاريخ</th>
            <th>الوقت</th>
            <th>الحالة</th>
            <th>الإجراء</th>
          </tr>

          ${
            (data||[]).map(b=>`

              <tr>

                <td>
                  ${b.booking_id}
                </td>

                <td>
                  ${esc(
                    b.sports_fields?.field_name
                  )}
                </td>

                <td>
                  ${b.booking_date}
                </td>

                <td>
                  ${b.start_time} -
                  ${b.end_time}
                </td>

                <td>
                  <span class="badge ok">
                    ${b.booking_status}
                  </span>
                </td>

                <td>

                  ${
                    b.booking_status === "Confirmed"
                    ?
                    `
                      <button
                        class="btn danger"
                        onclick="cancelMyBooking(${b.booking_id})"
                      >
                        إلغاء الحجز
                      </button>
                    `
                    :
                    ""
                  }

                </td>

              </tr>

            `).join("")
            ||
            `
              <tr>
                <td colspan="6">
                  لا توجد حجوزات.
                </td>
              </tr>
            `
          }

        </table>

      </div>

    </section>

  `);
}
async function cancelMyBooking(bookingId){

  const {data:booking,error}=await sb
    .from("bookings")
    .select(`
      booking_id,
      booking_date,
      start_time,
      end_time,
      booking_status
    `)
    .eq("booking_id",bookingId)
    .eq("customer_id",state.user.id)
    .maybeSingle();

  if(error){
    alert(error.message);
    return;
  }

  if(!booking){
    alert("الحجز غير موجود");
    return;
  }

  if(booking.booking_status !== "Confirmed"){
    alert("لا يمكن إلغاء هذا الحجز");
    return;
  }

  const endDateTime = new Date(
    booking.booking_date + "T" + booking.end_time
  );

  if(endDateTime <= new Date()){
    alert("لا يمكن إلغاء حجز انتهى وقته");
    return;
  }

  if(!confirm("هل أنت متأكد من إلغاء الحجز؟")){
    return;
  }

  const {error:updateError}=await sb
    .from("bookings")
    .update({
      booking_status:"Cancelled"
    })
    .eq("booking_id",bookingId)
    .eq("customer_id",state.user.id)
    .eq("booking_status","Confirmed");

  if(updateError){
    alert(updateError.message);
    return;
  }

  alert("تم إلغاء الحجز بنجاح");

  await render();
}

async function profile(){

  return shell(`

    <h1 class="title">
      الملف الشخصي
    </h1>

    <section class="section">

      <h2>
        بيانات الحساب
      </h2>

      <p>
        <b>الاسم:</b>
        ${esc(state.profile?.full_name)}
      </p>

      <p>
        <b>البريد:</b>
        ${esc(state.user.email)}
      </p>

      <p>
        <b>الهاتف:</b>
        ${esc(state.profile?.phone||"غير مضاف")}
      </p>

    </section>
  `);
}

async function managerBookings(){

  const {data,error}=await sb
    .from("bookings")
    .select(`
      booking_id,
      customer_id,
      booking_date,
      start_time,
      end_time,
      booking_status,
      sports_fields(field_name,price)
    `)
    .order("booking_date",{ascending:false});

  if(error){
    return shell(`
      <h1 class="title">الحجوزات</h1>
      <section class="section">
        <p>${esc(error.message)}</p>
      </section>
    `);
  }

  const rows=data||[];

  return shell(`
    <h1 class="title">الحجوزات</h1>

    <section class="section">

      <div style="overflow:auto">

        <table class="table">

          <tr>
            <th>رقم الحجز</th>
            <th>الملعب</th>
            <th>التاريخ</th>
            <th>الوقت</th>
            <th>السعر</th>
            <th>الحالة</th>
          </tr>

          ${
            rows.map(b=>`
              <tr>

                <td>
                  BK${b.booking_id}
                </td>

                <td>
                  ${esc(b.sports_fields?.field_name||"-")}
                </td>

                <td>
                  ${b.booking_date}
                </td>

                <td>
                  ${b.start_time} - ${b.end_time}
                </td>

                <td>
                  ${money(b.sports_fields?.price||0)}
                </td>

                <td>
                  <span class="badge ok">
                    ${esc(b.booking_status)}
                  </span>
                </td>

              </tr>
            `).join("")
            ||
            `<tr>
              <td colspan="6" style="text-align:center">
                لا توجد حجوزات.
              </td>
            </tr>`
          }

        </table>

      </div>

    </section>
  `);
}

async function managerCustomers(){

  const {data,error}=await sb
    .from("profiles")
    .select("id,full_name,phone,role")
    .neq("role","manager")
    .order("full_name");

  if(error){
    return shell(`
      <h1 class="title">العملاء</h1>
      <section class="section">
        <p>${esc(error.message)}</p>
      </section>
    `);
  }

  const customers=data||[];

  return shell(`
    <h1 class="title">العملاء</h1>

    <section class="section">

      <div style="overflow:auto">

        <table class="table">

          <tr>
            <th>الاسم</th>
            <th>رقم الهاتف</th>
            <th>معرف العميل</th>
          </tr>

          ${
            customers.map(c=>`
              <tr>

                <td>
                  ${esc(c.full_name||"غير محدد")}
                </td>

                <td>
                  ${esc(c.phone||"غير مضاف")}
                </td>

                <td>
                  ${esc(c.id)}
                </td>

              </tr>
            `).join("")
            ||
            `<tr>
              <td colspan="3" style="text-align:center">
                لا يوجد عملاء.
              </td>
            </tr>`
          }

        </table>

      </div>

    </section>
  `);
}



async function paymentMethodsPage(){

  const { data, error } = await sb
    .from("user_payment_methods")
    .select("*")
    .eq("user_id", state.user.id)
    .order("created_at", { ascending:false });

  if(error){
    return shell(`
      <h1 class="title">وسائل الدفع</h1>

      <section class="section">
        <p class="notice error">
          ${esc(error.message)}
        </p>
      </section>
    `);
  }

  const methods = data || [];

  return shell(`

    <h1 class="title">
      وسائل الدفع
    </h1>

    <section class="section">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:25px;
        direction:rtl;
      ">

        <div>
          <h2 style="margin:0 0 8px;">
            وسائل الدفع الخاصة بي
          </h2>

          <p class="muted" style="margin:0;">
            أضف وسائل الدفع التي تستخدمها لحجوزاتك
          </p>
        </div>

        <button
          class="btn primary"
          onclick="showAddPaymentMethodForm()"
        >
          + إضافة وسيلة دفع
        </button>

      </div>


      ${
        methods.length === 0

        ?

        `
        <div style="
          text-align:center;
          padding:50px 20px;
          color:#777;
        ">
          <div style="font-size:45px;margin-bottom:15px;">
            💳
          </div>

          <h3>
            لا توجد وسائل دفع محفوظة
          </h3>

          <p>
            أضف وسيلة دفع لتستخدمها بسهولة عند الحجز.
          </p>
        </div>
        `

        :

        `
        <div style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
          gap:18px;
          direction:rtl;
        ">

          ${methods.map(m => `

            <div style="
              background:#fff;
              border:1px solid #e3e7ea;
              border-radius:15px;
              padding:20px;
              box-shadow:0 2px 8px rgba(0,0,0,.04);
            ">

              <div style="
                display:flex;
                align-items:center;
                gap:15px;
                margin-bottom:15px;
              ">

                <div style="
                  width:50px;
                  height:50px;
                  border-radius:12px;
                  background:#f1f5f4;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:27px;
                ">
                  ${
                    String(m.method_name).toLowerCase().includes("visa")
                    ? "💳"
                    : String(m.method_name).toLowerCase().includes("wallet")
                    ? "📱"
                    : "💰"
                  }
                </div>

                <div>

                  <h3 style="
                    margin:0 0 5px;
                  ">
                    ${esc(m.method_name)}
                  </h3>

                  <span style="
                    color:#777;
                    font-size:14px;
                  ">
                    وسيلة دفع محفوظة
                  </span>

                </div>

              </div>


              <div style="
                background:#f8faf9;
                border-radius:10px;
                padding:12px;
                margin-bottom:15px;
                direction:ltr;
                text-align:left;
              ">
                ${
  (() => {
    try {
      const d = JSON.parse(m.payment_details);

      if(m.method_name === "Visa"){
        return `
          <div style="font-size:16px;">
            💳 بطاقة Visa
            <br>
            <span style="color:#666;">
              •••• ${esc(d.card_last4 || "")}
            </span>
            <br>
            <span style="color:#666;">
              تاريخ الانتهاء: ${esc(d.expiry || "")}
            </span>
          </div>
        `;
      }

      if(m.method_name === "Wallet"){
        return `
          <div style="font-size:16px;">
            📱 رقم المحفظة
            <br>
            <span style="color:#666;">
              ${esc(d.wallet_number || "")}
            </span>
          </div>
        `;
      }

      return esc(m.payment_details);

    } catch(e){
      return esc(m.payment_details);
    }
  })()
}
              </div>


              <button
                class="btn"
                style="
                  width:100%;
                  background:#dc3545;
                  color:white;
                  border:0;
                "
                onclick="deleteUserPaymentMethod(${m.id})"
              >
                حذف وسيلة الدفع
              </button>

            </div>

          `).join("")}

        </div>
        `
      }

    </section>

  `);
}
async function addUserPaymentMethod(){

  const method = prompt(
    "اختر وسيلة الدفع:\n\n" +
    "1 - Visa\n" +
    "2 - Wallet\n" +
    "3 - Fawry\n" +
    "4 - Aman"
  );

  if(!method) return;

  let methodName = "";
  let details = "";

  if(method === "1"){

    const cardNumber = prompt("أدخل رقم البطاقة:");
    if(!cardNumber) return;

    const cvv = prompt("أدخل CVV:");
    if(!cvv) return;

    const expiry = prompt("أدخل تاريخ انتهاء البطاقة (MM/YY):");
    if(!expiry) return;

    methodName = "Visa";

    details = JSON.stringify({
      card_number: cardNumber,
      cvv: cvv,
      expiry: expiry
    });

  }

  else if(method === "2"){

    const walletNumber = prompt(
      "أدخل رقم المحفظة:"
    );

    if(!walletNumber) return;

    methodName = "Wallet";

    details = JSON.stringify({
      wallet_number: walletNumber
    });

  }

  else if(method === "3"){

    alert(
      "Fawry غير متاحة حاليًا.\n" +
      "سيتم توفيرها قريبًا."
    );

    return;

  }

  else if(method === "4"){

    alert(
      "Aman غير متاحة حاليًا.\n" +
      "سيتم توفيرها قريبًا."
    );

    return;

  }

  else{

    alert("اختيار غير صحيح.");
    return;

  }


  const { error } = await sb
    .from("user_payment_methods")
    .insert({
      user_id: state.user.id,
      method_name: methodName,
      payment_details: details
    });


  if(error){

    alert(error.message);
    return;

  }


  state.page = "paymentMethods";

  await render();

}







function showAddPaymentMethodForm(){

  const form = document.createElement("div");

  form.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
      direction:rtl;
    ">

      <div style="
        background:#fff;
        width:min(500px,92%);
        border-radius:18px;
        padding:25px;
        box-shadow:0 15px 40px rgba(0,0,0,.2);
      ">

        <h2 style="margin-top:0;">
          إضافة وسيلة دفع
        </h2>

        <label style="display:block;margin-bottom:8px;">
          نوع وسيلة الدفع
        </label>

        <select
          id="newPaymentType"
          style="
            width:100%;
            padding:13px;
            border:1px solid #ddd;
            border-radius:10px;
            margin-bottom:18px;
          "
          onchange="changePaymentForm()"
        >
          <option value="">اختر وسيلة الدفع</option>
          <option value="Visa">Visa</option>
          <option value="Wallet">Wallet</option>
          <option value="Fawry">Fawry</option>
          <option value="Aman">Aman</option>
        </select>

        <div id="paymentFields"></div>

        <div style="
          display:flex;
          gap:10px;
          margin-top:20px;
        ">

          <button
            class="btn primary"
            style="flex:1"
            onclick="saveNewPaymentMethod()"
          >
            حفظ
          </button>

          <button
            class="btn"
            style="flex:1"
            onclick="this.closest('div[style*=fixed]').remove()"
          >
            إلغاء
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(form);
}


function changePaymentForm(){

  const type = document.getElementById("newPaymentType")?.value;
  const box = document.getElementById("paymentFields");

  if(!box) return;

  if(type === "Visa"){

    box.innerHTML = `

      <label>رقم البطاقة</label>

      <input
        id="cardNumber"
        type="text"
        inputmode="numeric"
        maxlength="19"
        placeholder="1234 5678 9012 3456"
        style="
          width:100%;
          padding:13px;
          margin:7px 0 15px;
          border:1px solid #ddd;
          border-radius:10px;
          box-sizing:border-box;
        "
      >

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      ">

        <div>

          <label>تاريخ الانتهاء</label>

          <input
            id="cardExpiry"
            type="text"
            maxlength="5"
            placeholder="MM/YY"
            style="
              width:100%;
              padding:13px;
              margin-top:7px;
              border:1px solid #ddd;
              border-radius:10px;
              box-sizing:border-box;
            "
          >

        </div>

        <div>

          <label>CVV</label>

          <input
            id="cardCvv"
            type="password"
            inputmode="numeric"
            maxlength="4"
            placeholder="CVV"
            style="
              width:100%;
              padding:13px;
              margin-top:7px;
              border:1px solid #ddd;
              border-radius:10px;
              box-sizing:border-box;
            "
          >

        </div>

      </div>

      <small style="
        display:block;
        color:#777;
        margin-top:12px;
      ">
        لن يتم حفظ CVV في قاعدة البيانات.
      </small>
    `;

  }

  else if(type === "Wallet"){

    box.innerHTML = `

      <label>رقم المحفظة</label>

      <input
        id="walletNumber"
        type="tel"
        inputmode="numeric"
        maxlength="11"
        placeholder="01xxxxxxxxx"
        style="
          width:100%;
          padding:13px;
          margin-top:7px;
          border:1px solid #ddd;
          border-radius:10px;
          box-sizing:border-box;
        "
      >

    `;

  }

  else if(type === "Fawry" || type === "Aman"){

    box.innerHTML = `

      <div style="
        background:#fff8e1;
        border:1px solid #f0d98c;
        border-radius:10px;
        padding:15px;
        margin-top:10px;
        color:#856404;
      ">
        ⚠️ وسيلة الدفع دي غير متاحة حاليًا.
        <br>
        سيتم توفيرها قريبًا.
      </div>

    `;

  }

  else{

    box.innerHTML = "";

  }
}


async function saveNewPaymentMethod(){

  const type =
    document.getElementById("newPaymentType")?.value;

  if(!type){

    alert("اختر وسيلة الدفع أولاً.");
    return;

  }


  if(type === "Fawry" || type === "Aman"){

    alert("وسيلة الدفع دي غير متاحة حاليًا.");
    return;

  }


  let details = {};


  if(type === "Visa"){

    const cardNumber =
      document.getElementById("cardNumber")?.value.trim();

    const expiry =
      document.getElementById("cardExpiry")?.value.trim();

    const cvv =
      document.getElementById("cardCvv")?.value.trim();


    if(!cardNumber || !expiry || !cvv){

      alert("أكمل بيانات البطاقة.");
      return;

    }


    const cleanNumber =
      cardNumber.replace(/\s/g,"");


    if(!/^\d{16}$/.test(cleanNumber)){

      alert("رقم البطاقة يجب أن يكون 16 رقم.");
      return;

    }


    if(!/^\d{2}\/\d{2}$/.test(expiry)){

      alert("اكتب تاريخ الانتهاء بالشكل MM/YY.");
      return;

    }


    if(!/^\d{3,4}$/.test(cvv)){

      alert("CVV غير صحيح.");
      return;

    }


    details = {

      card_last4:
        cleanNumber.slice(-4),

      expiry: expiry

    };

  }


  else if(type === "Wallet"){

    const wallet =
      document.getElementById("walletNumber")?.value.trim();


    if(!wallet){

      alert("اكتب رقم المحفظة.");
      return;

    }


    if(!/^01\d{9}$/.test(wallet)){

      alert("رقم المحفظة يجب أن يكون رقم هاتف مصري صحيح.");
      return;

    }


    details = {

      wallet_number: wallet

    };

  }


  const { error } = await sb
    .from("user_payment_methods")
    .insert({

      user_id: state.user.id,

      method_name: type,

      payment_details: JSON.stringify(details)

    });


  if(error){

    alert(error.message);
    return;

  }


  document
    .querySelector('div[style*="position:fixed"]')
    ?.remove();


  state.page = "paymentMethods";

  await render();

}


async function deleteUserPaymentMethod(id){

  if(!confirm("هل تريد حذف وسيلة الدفع دي؟"))
    return;

  const { error } = await sb
    .from("user_payment_methods")
    .delete()
    .eq("id", id)
    .eq("user_id", state.user.id);

  if(error){
    alert(error.message);
    return;
  }

  state.page = "paymentMethods";

  await render();
}


async function receptionistDashboard(){

  const today = new Date()
    .toISOString()
    .slice(0,10);

  const { data: bookings, error } = await sb
    .from("bookings")
    .select("*")
    .eq("booking_date", today)
    .order("start_time", { ascending:true });

  if(error){
    return shell(`
      <h1 class="title">لوحة الاستقبال</h1>

      <section class="section">
        <p class="notice error">
          ${esc(error.message)}
        </p>
      </section>
    `);
  }

  const list = bookings || [];

  const confirmed =
    list.filter(b =>
      String(b.booking_status).toLowerCase() === "confirmed"
    ).length;

  const pending =
    list.filter(b =>
      String(b.booking_status).toLowerCase() === "pending"
    ).length;

  const cancelled =
    list.filter(b =>
      String(b.booking_status).toLowerCase() === "cancelled"
    ).length;


  return shell(`

    <div style="
      direction:rtl;
      text-align:right;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:25px;
      ">

        <div>
          <h1 class="title" style="margin-bottom:6px;">
            لوحة الاستقبال
          </h1>

          <p class="muted">
            إدارة حجوزات اليوم ومتابعة حالة الملاعب
          </p>
        </div>

        <div style="
          background:#f3f7f5;
          padding:12px 18px;
          border-radius:12px;
        ">
          📅 ${today}
        </div>

      </div>


      <!-- الإحصائيات -->

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(190px,1fr));
        gap:16px;
        margin-bottom:25px;
      ">

        <div class="section" style="margin:0;">
          <div style="font-size:30px;">📅</div>
          <div class="muted">حجوزات اليوم</div>
          <h2 style="margin:5px 0 0;">
            ${list.length}
          </h2>
        </div>


        <div class="section" style="margin:0;">
          <div style="font-size:30px;">🟢</div>
          <div class="muted">حجوزات مؤكدة</div>
          <h2 style="margin:5px 0 0;">
            ${confirmed}
          </h2>
        </div>


        <div class="section" style="margin:0;">
          <div style="font-size:30px;">⏳</div>
          <div class="muted">معلقة</div>
          <h2 style="margin:5px 0 0;">
            ${pending}
          </h2>
        </div>


        <div class="section" style="margin:0;">
          <div style="font-size:30px;">❌</div>
          <div class="muted">ملغاة</div>
          <h2 style="margin:5px 0 0;">
            ${cancelled}
          </h2>
        </div>

      </div>


      <!-- اختصارات -->

      <section class="section">

        <h2>
          الوصول السريع
        </h2>

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(220px,1fr));
          gap:15px;
          margin-top:18px;
        ">

          <button
            class="btn primary"
            style="padding:22px;"
            onclick="state.page='receptionistBookings'; render();"
          >
            📅
            <br>
            إدارة الحجوزات
          </button>


          <button
            class="btn"
            style="padding:22px;"
            onclick="go('receptionistAvailability')"
          >
            🏟️
            <br>
            توافر الملاعب
          </button>

        </div>

      </section>


      <!-- حجوزات اليوم -->

      <section class="section">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:15px;
        ">

          <h2 style="margin:0;">
            حجوزات اليوم
          </h2>

          <button
            class="btn"
            onclick="go('receptionistBookings')"
          >
            عرض الكل
          </button>

        </div>


        ${
          list.length === 0

          ?

          `
          <div style="
            text-align:center;
            padding:40px;
            color:#777;
          ">
            📭
            <br><br>
            لا توجد حجوزات اليوم
          </div>
          `

          :

          `
          <div style="
            overflow-x:auto;
          ">

            <table style="
              width:100%;
              border-collapse:collapse;
              direction:rtl;
            ">

              <thead>

                <tr>
                  <th style="padding:12px;text-align:right;">
                    الوقت
                  </th>

                  <th style="padding:12px;text-align:right;">
                    الملعب
                  </th>

                  <th style="padding:12px;text-align:right;">
                    الحالة
                  </th>
                </tr>

              </thead>

              <tbody>

                ${list.slice(0,6).map(b => `

                  <tr>

                    <td style="padding:12px;">
                      ${esc(b.start_time || "")}
                      -
                      ${esc(b.end_time || "")}
                    </td>

                    <td style="padding:12px;">
                      ${esc(b.field_id || "-")}
                    </td>

                    <td style="padding:12px;">
                      ${esc(b.booking_status || "-")}
                    </td>

                  </tr>

                `).join("")}

              </tbody>

            </table>

          </div>
          `
        }

      </section>

    </div>

  `);
}

async function receptionistBookings(){

  const { data: bookings, error } = await sb
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending:false })
    .order("start_time", { ascending:true });

  if(error){
    return shell(`
      <div style="direction:rtl;text-align:right">

        <h1 class="title">
          إدارة الحجوزات
        </h1>

        <section class="section">
          <p class="notice error">
            ${esc(error.message)}
          </p>
        </section>

      </div>
    `);
  }

  const list = bookings || [];


  return shell(`

    <div style="
      direction:rtl;
      text-align:right;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:25px;
        gap:15px;
        flex-wrap:wrap;
      ">

        <div>

          <h1 class="title" style="margin-bottom:6px;">
            إدارة الحجوزات
          </h1>

          <p class="muted">
            متابعة حجوزات العملاء وإدارة حالتها
          </p>

        </div>


        <button
          class="btn"
          onclick="go('receptionist')"
        >
          ← لوحة الاستقبال
        </button>

      </div>


      <!-- البحث -->

      <section class="section">

        <div style="
          display:grid;
          grid-template-columns:
            minmax(200px,1fr)
            minmax(160px,220px);
          gap:12px;
        ">

          <input
            id="receptionSearch"
            class="input"
            placeholder="🔍 ابحث في الحجوزات..."
            oninput="filterReceptionBookings()"
          >

          <select
            id="receptionStatus"
            class="input"
            onchange="filterReceptionBookings()"
          >

            <option value="">
              كل الحالات
            </option>

            <option value="confirmed">
              مؤكدة
            </option>

            <option value="pending">
              معلقة
            </option>

            <option value="cancelled">
              ملغاة
            </option>

          </select>

        </div>

      </section>


      <!-- جدول الحجوزات -->

      <section class="section">

        <div style="
          overflow-x:auto;
        ">

          <table
            id="receptionBookingsTable"
            style="
              width:100%;
              border-collapse:collapse;
              direction:rtl;
            "
          >

            <thead>

              <tr>

                <th style="padding:14px;text-align:right;">
                  التاريخ
                </th>

                <th style="padding:14px;text-align:right;">
                  الوقت
                </th>

                <th style="padding:14px;text-align:right;">
                  الملعب
                </th>

                <th style="padding:14px;text-align:right;">
                  العميل
                </th>

                <th style="padding:14px;text-align:right;">
                  الحالة
                </th>

                <th style="padding:14px;text-align:right;">
                  الإجراء
                </th>

              </tr>

            </thead>


            <tbody>

              ${
                list.length === 0

                ?

                `
                <tr>

                  <td
                    colspan="6"
                    style="
                      text-align:center;
                      padding:50px;
                      color:#777;
                    "
                  >

                    📭
                    <br><br>

                    لا توجد حجوزات

                  </td>

                </tr>
                `

                :

                list.map(b => `

                  <tr
                    class="reception-booking-row"
                    data-search="
                      ${String(
                        b.booking_date || ""
                      ).toLowerCase()}

                      ${String(
                        b.booking_status || ""
                      ).toLowerCase()}

                      ${String(
                        b.field_id || ""
                      ).toLowerCase()}

                      ${String(
                        b.user_id || ""
                      ).toLowerCase()}
                    "
                    data-status="
                      ${String(
                        b.booking_status || ""
                      ).toLowerCase()}
                    "
                  >

                    <td style="padding:14px;">
                      ${esc(b.booking_date || "-")}
                    </td>


                    <td style="padding:14px;white-space:nowrap;">

                      ${esc(b.start_time || "-")}

                      <span style="
                        margin:0 5px;
                        color:#999;
                      ">
                        →
                      </span>

                      ${esc(b.end_time || "-")}

                    </td>


                    <td style="padding:14px;">
                      ${esc(b.field_id || "-")}
                    </td>


                    <td style="padding:14px;">
                      ${esc(b.user_id || "-")}
                    </td>


                    <td style="padding:14px;">

                      ${
                        String(b.booking_status).toLowerCase()
                        === "confirmed"

                        ?

                        `<span style="
                          background:#e8f7ee;
                          color:#16834b;
                          padding:6px 10px;
                          border-radius:20px;
                          font-size:13px;
                        ">
                          🟢 مؤكدة
                        </span>`

                        :

                        String(b.booking_status).toLowerCase()
                        === "cancelled"

                        ?

                        `<span style="
                          background:#fdecec;
                          color:#c62828;
                          padding:6px 10px;
                          border-radius:20px;
                          font-size:13px;
                        ">
                          🔴 ملغاة
                        </span>`

                        :

                        `<span style="
                          background:#fff5df;
                          color:#a66a00;
                          padding:6px 10px;
                          border-radius:20px;
                          font-size:13px;
                        ">
                          ⏳ معلقة
                        </span>`
                      }

                    </td>


                    <td style="padding:14px;">

                      <div style="
                        display:flex;
                        gap:7px;
                        flex-wrap:wrap;
                      ">

                        ${
                          String(
                            b.booking_status
                          ).toLowerCase() !== "confirmed"

                          ?

                          `
                          <button
                            class="btn"
                            onclick="
                              receptionistConfirmBooking(
                                '${b.id}'
                              )
                            "
                          >
                            ✓ تأكيد
                          </button>
                          `

                          :

                          ""
                        }


                        ${
                          String(
                            b.booking_status
                          ).toLowerCase() !== "cancelled"

                          ?

                          `
                          <button
                            class="btn"
                            onclick="
                              receptionistCancelBooking(
                                '${b.id}'
                              )
                            "
                          >
                            إلغاء
                          </button>
                          `

                          :

                          ""
                        }

                      </div>

                    </td>

                  </tr>

                `).join("")
              }

            </tbody>

          </table>

        </div>

      </section>

    </div>

  `);
}
function filterReceptionBookings(){

  const search =
    (
      document.getElementById("receptionSearch")?.value
      || ""
    ).toLowerCase().trim();

  const status =
    (
      document.getElementById("receptionStatus")?.value
      || ""
    ).toLowerCase();

  document
    .querySelectorAll(".reception-booking-row")
    .forEach(row => {

      const text =
        row.dataset.search || "";

      const rowStatus =
        row.dataset.status || "";

      const matchSearch =
        !search ||
        text.includes(search);

      const matchStatus =
        !status ||
        rowStatus === status;

      row.style.display =
        matchSearch && matchStatus
        ? ""
        : "none";

    });
}


async function receptionistConfirmBooking(id){

  if(!confirm("تأكيد هذا الحجز؟"))
    return;

  const { error } = await sb
    .from("bookings")
    .update({
      booking_status:"confirmed"
    })
    .eq("id",id);

  if(error){

    alert(error.message);
    return;

  }

  state.page="receptionistBookings";

  await render();
}


async function receptionistCancelBooking(id){

  if(!confirm("هل تريد إلغاء هذا الحجز؟"))
    return;

  const { error } = await sb
    .from("bookings")
    .update({
      booking_status:"cancelled"
    })
    .eq("id",id);

  if(error){

    alert(error.message);
    return;

  }

  state.page="receptionistBookings";

  await render();
}
async function receptionistAvailability(){

  const today = new Date()
    .toISOString()
    .slice(0,10);

  const selectedDate =
    state.receptionDate || today;

  const { data: fields, error: fieldsError } = await sb
    .from("fields")
    .select("*")
    .order("id", { ascending:true });

  if(fieldsError){
    return shell(`
      <div style="direction:rtl;text-align:right">

        <h1 class="title">
          توافر الملاعب
        </h1>

        <section class="section">
          <p class="notice error">
            ${esc(fieldsError.message)}
          </p>
        </section>

      </div>
    `);
  }

  const { data: bookings, error: bookingsError } = await sb
    .from("bookings")
    .select("*")
    .eq("booking_date", selectedDate)
    .neq("booking_status", "cancelled")
    .order("start_time", { ascending:true });

  if(bookingsError){
    return shell(`
      <div style="direction:rtl;text-align:right">

        <h1 class="title">
          توافر الملاعب
        </h1>

        <section class="section">
          <p class="notice error">
            ${esc(bookingsError.message)}
          </p>
        </section>

      </div>
    `);
  }

  const list = bookings || [];


  return shell(`

    <div style="
      direction:rtl;
      text-align:right;
    ">

      <!-- Header -->

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;
        flex-wrap:wrap;
        margin-bottom:25px;
      ">

        <div>

          <h1 class="title" style="margin-bottom:6px;">
            توافر الملاعب
          </h1>

          <p class="muted">
            متابعة حالة الملاعب والمواعيد المتاحة
          </p>

        </div>


        <button
          class="btn"
          onclick="go('receptionist')"
        >
          ← لوحة الاستقبال
        </button>

      </div>


      <!-- التاريخ -->

      <section class="section">

        <label style="
          display:block;
          margin-bottom:8px;
          font-weight:bold;
        ">
          اختر التاريخ
        </label>

        <input
          class="input"
          type="date"
          value="${selectedDate}"
          min="${today}"
          onchange="
            state.receptionDate=this.value;
            render();
          "
        >

      </section>


      <!-- الملعب -->

      <section class="section">

        <h2 style="margin-top:0;">
          حالة الملاعب
        </h2>

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(220px,1fr));
          gap:16px;
        ">

          ${
            (fields || []).map(field => {

              const fieldBookings =
                list.filter(b =>
                  String(b.field_id) === String(field.id)
                );

              const hasBooking =
                fieldBookings.length > 0;

              return `

                <div style="
                  background:#fff;
                  border:1px solid #e3e7ea;
                  border-radius:16px;
                  padding:20px;
                  box-shadow:0 3px 12px rgba(0,0,0,.05);
                ">

                  <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:10px;
                    margin-bottom:15px;
                  ">

                    <div>

                      <h3 style="
                        margin:0 0 6px;
                      ">
                        ${esc(field.field_name || field.name || "ملعب")}
                      </h3>

                      <span class="muted">
                        ${esc(field.field_type || "")}
                      </span>

                    </div>


                    <div style="
                      font-size:30px;
                    ">
                      🏟️
                    </div>

                  </div>


                  ${
                    hasBooking

                    ?

                    `
                    <div style="
                      background:#fff0f0;
                      color:#c62828;
                      padding:10px;
                      border-radius:10px;
                      text-align:center;
                      font-weight:bold;
                    ">
                      🔴 يوجد حجز
                    </div>
                    `

                    :

                    `
                    <div style="
                      background:#eaf8ef;
                      color:#16834b;
                      padding:10px;
                      border-radius:10px;
                      text-align:center;
                      font-weight:bold;
                    ">
                      🟢 متاح
                    </div>
                    `
                  }

                </div>

              `;

            }).join("")
          }

        </div>

      </section>


      <!-- جدول المواعيد -->

      <section class="section">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:18px;
        ">

          <div>

            <h2 style="margin:0 0 5px;">
              مواعيد الحجوزات
            </h2>

            <p class="muted" style="margin:0;">
              ${esc(selectedDate)}
            </p>

          </div>

        </div>


        ${
          list.length === 0

          ?

          `
          <div style="
            text-align:center;
            padding:45px 20px;
            color:#777;
          ">

            <div style="
              font-size:45px;
              margin-bottom:12px;
            ">
              🟢
            </div>

            لا توجد حجوزات في هذا اليوم
          </div>
          `

          :

          `
          <div style="
            overflow-x:auto;
          ">

            <table style="
              width:100%;
              border-collapse:collapse;
              direction:rtl;
            ">

              <thead>

                <tr>

                  <th style="padding:13px;text-align:right;">
                    الملعب
                  </th>

                  <th style="padding:13px;text-align:right;">
                    البداية
                  </th>

                  <th style="padding:13px;text-align:right;">
                    النهاية
                  </th>

                  <th style="padding:13px;text-align:right;">
                    الحالة
                  </th>

                </tr>

              </thead>


              <tbody>

                ${list.map(b => `

                  <tr>

                    <td style="padding:13px;">
                      ${esc(b.field_id || "-")}
                    </td>

                    <td style="padding:13px;">
                      ${esc(b.start_time || "-")}
                    </td>

                    <td style="padding:13px;">
                      ${esc(b.end_time || "-")}
                    </td>

                    <td style="padding:13px;">

                      ${
                        String(b.booking_status).toLowerCase()
                        === "confirmed"

                        ?

                        `
                        <span style="
                          color:#16834b;
                          font-weight:bold;
                        ">
                          🟢 مؤكد
                        </span>
                        `

                        :

                        `
                        <span style="
                          color:#a66a00;
                          font-weight:bold;
                        ">
                          ⏳ معلق
                        </span>
                        `
                      }

                    </td>

                  </tr>

                `).join("")}

              </tbody>

            </table>

          </div>
          `
        }

      </section>

    </div>

  `);
}
async function render(){

  if(!configured()){
    app.innerHTML=auth("login")
      .replace(
        '<div id="msg" class="notice hide"></div>',
        '<div id="msg" class="notice error">ضع بيانات Supabase في config.js</div>'
      );
    return;
  }

  if(state.page==="login"){
    app.innerHTML=auth("login");
    return;
  }

  if(state.page==="signup"){
    app.innerHTML=auth("signup");
    return;
  }

  if(!state.user){
    state.page="login";
    app.innerHTML=auth("login");
    return;
  }


  /* =========================
     المدير
     ========================= */

  const isManager =
    state.profile?.role === "manager";

  if(isManager){

    if(state.page==="manager"){
      app.innerHTML=await managerDashboard();
    }

    else if(state.page==="bookings"){
      app.innerHTML=await managerBookings();
    }

   else if(state.page==="fields"){
  app.innerHTML=await managerFieldsPage();
}

    else if(state.page==="profile"){
      app.innerHTML=await managerCustomers();
    }

    else{
      state.page="manager";
      app.innerHTML=await managerDashboard();
    }

    return;
  }


  /* =========================
     موظف الاستقبال
     ========================= */

  const isReceptionist =
    state.profile?.role === "receptionist";

  if(isReceptionist){

    if(state.page==="receptionist"){

      app.innerHTML =
        await receptionistDashboard();

    }

   else if(state.page==="receptionistBookings"){

  app.innerHTML =
    await receptionistBookings();

}

    else if(state.page==="receptionistAvailability"){

      app.innerHTML =
        await receptionistAvailability();

    }

    else{

      state.page="receptionist";

      app.innerHTML =
        await receptionistDashboard();

    }

    return;
  }


  /* =========================
     المستخدم العادي
     ========================= */

  if(state.page==="manager"){
    state.page="dashboard";
  }

  if(state.page==="receptionist"){
    state.page="dashboard";
  }

  if(state.page==="receptionistBookings"){
    state.page="dashboard";
  }

  if(state.page==="receptionistAvailability"){
    state.page="dashboard";
  }


  if(state.page==="dashboard"){

    app.innerHTML =
      await customerDashboard();

  }

  else if(state.page==="fields"){

    app.innerHTML =
      fieldsPage();

  }

  else if(state.page==="booking"){

    app.innerHTML =
      booking();

  }

  else if(state.page==="availability"){

    app.innerHTML =
      availability();

  }

  else if(state.page==="payment"){

    app.innerHTML =
      await payment();

  }

  else if(state.page==="paymentMethods"){

    app.innerHTML =
      await paymentMethodsPage();

  }

  else if(state.page==="success"){

    app.innerHTML =
      success();

  }

  else if(state.page==="bookings"){

    app.innerHTML =
      await bookings();

  }

  else if(state.page==="profile"){

    app.innerHTML =
      await profile();

  }

  else{

    state.page="dashboard";

    app.innerHTML =
      await customerDashboard();

  }

}

init();
