const vehicles = [
  {
    name: "Mercedes-Benz C-Class",
    category: "سيدان",
    price: "4,500",
    status: "متاحة",
    tone: "silver",
  },
  { name: "BMW X3", category: "دفع رباعي", price: "5,800", status: "متاحة", tone: "black" },
  {
    name: "Toyota Corolla",
    category: "اقتصادية",
    price: "1,900",
    status: "قيد المراجعة",
    tone: "white",
  },
];

function dateInputValue(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export default function HomePage() {
  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="العودة إلى الصفحة الرئيسية">
          <span className="brand-mark">R</span>
          <span>
            <strong>RAHAL</strong>
            <small>رحال لتأجير السيارات</small>
          </span>
        </a>
        <nav aria-label="التنقل الرئيسي">
          <a href="#fleet">السيارات</a>
          <a href="#process">طريقة الحجز</a>
          <a href="#branch">الفرع</a>
        </nav>
        <div className="header-actions">
          <a className="language" href="/en">
            EN
          </a>
          <button className="button button-dark">تسجيل الدخول</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">اختيار واضح · طلب آمن · متابعة حقيقية</span>
            <h1>
              العربية المناسبة،
              <br />
              <em>في الموعد المناسب.</em>
            </h1>
            <p>
              شاهد السيارات المتاحة وأسعارها، اختر المدة، وأرسل طلبك لفريق رحال للمراجعة والتأكيد في
              الفرع.
            </p>
            <div className="hero-actions">
              <a className="button button-gold" href="#fleet">
                استعرض السيارات
              </a>
              <a className="text-link" href="#process">
                اعرف خطوات الحجز ←
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-label="سيارة رحال تجريبية">
            <div className="road-line" />
            <div className="car-silhouette">
              <span>RAHAL</span>
            </div>
            <div className="availability">
              <i /> متاحة لتقديم طلب الآن
            </div>
          </div>
        </div>
      </section>

      <section className="search-card shell" aria-label="البحث عن سيارة متاحة">
        <label>
          <span>الاستلام</span>
          <input type="date" defaultValue={dateInputValue(2)} />
        </label>
        <label>
          <span>الإرجاع</span>
          <input type="date" defaultValue={dateInputValue(5)} />
        </label>
        <label>
          <span>نظام السائق</span>
          <select defaultValue="any">
            <option value="any">أي نظام</option>
            <option>بدون سائق</option>
            <option>بسائق</option>
          </select>
        </label>
        <button className="button button-dark">تحقق من المتاح</button>
      </section>

      <section className="section shell" id="fleet">
        <div className="section-heading">
          <div>
            <span className="eyebrow">أسطول رحال</span>
            <h2>اختر عربيتك</h2>
          </div>
          <a className="text-link" href="#fleet">
            عرض كل السيارات ←
          </a>
        </div>
        <div className="vehicle-grid">
          {vehicles.map((vehicle) => (
            <article className="vehicle-card" key={vehicle.name}>
              <div className={`vehicle-image ${vehicle.tone}`}>
                <span>{vehicle.name.split(" ")[0]}</span>
              </div>
              <div className="vehicle-body">
                <div className="vehicle-meta">
                  <span>{vehicle.category}</span>
                  <b className={vehicle.status === "متاحة" ? "available" : "booked"}>
                    {vehicle.status}
                  </b>
                </div>
                <h3>{vehicle.name}</h3>
                <div className="specs">
                  <span>أوتوماتيك</span>
                  <span>5 مقاعد</span>
                  <span>تكييف</span>
                </div>
                <div className="price">
                  <strong>{vehicle.price} ج.م</strong>
                  <small> / اليوم</small>
                </div>
                <button className="button button-outline">عرض التفاصيل</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="process" id="process">
        <div className="shell section">
          <div className="section-heading light">
            <div>
              <span className="eyebrow">بدون دفع أونلاين</span>
              <h2>الحجز في 4 خطوات</h2>
            </div>
          </div>
          <div className="steps">
            <article>
              <b>01</b>
              <h3>اختر العربية والمدة</h3>
              <p>النظام يعرض الأيام المتاحة والتكلفة التقديرية.</p>
            </article>
            <article>
              <b>02</b>
              <h3>أرسل طلب الحجز</h3>
              <p>سجل بياناتك وارفع المستندات المطلوبة بأمان.</p>
            </article>
            <article>
              <b>03</b>
              <h3>مراجعة فريق المبيعات</h3>
              <p>موظف رحال يراجع الطلب ويرد عليك بالإشعارات.</p>
            </article>
            <article>
              <b>04</b>
              <h3>التأكيد في الفرع</h3>
              <p>الحضور ودفع العربون وتوقيع أوراق التأجير.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="branch shell section" id="branch">
        <div>
          <span className="eyebrow">فرع رحال</span>
          <h2>الاستلام والإرجاع من المقر</h2>
          <p>بيانات العنوان النهائية تؤكد من المالك قبل الإنتاج.</p>
        </div>
        <div className="contact">
          <a href="tel:01011105159">010 111 05159</a>
          <a href="tel:01113999155">011 13999 155</a>
        </div>
      </section>

      <footer>
        <div className="shell">
          <strong>RAHAL | رحال</strong>
          <span>نسخة تجريبية — جميع السيارات والبيانات المعروضة وهمية.</span>
        </div>
      </footer>
    </main>
  );
}
