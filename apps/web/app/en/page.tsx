const vehicles = [
  {
    name: "Mercedes-Benz C-Class",
    category: "Sedan",
    price: "4,500",
    status: "Available",
    tone: "silver",
  },
  { name: "BMW X3", category: "SUV", price: "5,800", status: "Available", tone: "black" },
  {
    name: "Toyota Corolla",
    category: "Economy",
    price: "1,900",
    status: "Under review",
    tone: "white",
  },
];

function dateInputValue(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export default function EnglishHomePage() {
  return (
    <main dir="ltr" className="ltr">
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="Rahal home">
          <span className="brand-mark">R</span>
          <span>
            <strong>RAHAL</strong>
            <small>Car Rental</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#fleet">Fleet</a>
          <a href="#process">How it works</a>
          <a href="#branch">Branch</a>
        </nav>
        <div className="header-actions">
          <a className="language" href="/">
            العربية
          </a>
          <button className="button button-dark">Sign in</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">CLEAR CHOICE · SAFE REQUEST · REAL FOLLOW-UP</span>
            <h1>
              The right car,
              <br />
              <em>at the right time.</em>
            </h1>
            <p>
              Browse available vehicles and prices, select your dates, and send a reservation
              request to the Rahal sales team for branch confirmation.
            </p>
            <div className="hero-actions">
              <a className="button button-gold" href="#fleet">
                Browse vehicles
              </a>
              <a className="text-link" href="#process">
                See how it works →
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-label="Demo Rahal vehicle">
            <div className="road-line" />
            <div className="car-silhouette">
              <span>RAHAL</span>
            </div>
            <div className="availability">
              <i /> Available for request
            </div>
          </div>
        </div>
      </section>

      <section className="search-card shell" aria-label="Search for an available car">
        <label>
          <span>Pickup</span>
          <input type="date" defaultValue={dateInputValue(2)} />
        </label>
        <label>
          <span>Return</span>
          <input type="date" defaultValue={dateInputValue(5)} />
        </label>
        <label>
          <span>Driver</span>
          <select defaultValue="any">
            <option value="any">Any option</option>
            <option>Without driver</option>
            <option>With driver</option>
          </select>
        </label>
        <button className="button button-dark">Check availability</button>
      </section>

      <section className="section shell" id="fleet">
        <div className="section-heading">
          <div>
            <span className="eyebrow">RAHAL FLEET</span>
            <h2>Choose your car</h2>
          </div>
          <a className="text-link" href="#fleet">
            View all vehicles →
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
                  <b className={vehicle.status === "Available" ? "available" : "booked"}>
                    {vehicle.status}
                  </b>
                </div>
                <h3>{vehicle.name}</h3>
                <div className="specs">
                  <span>Automatic</span>
                  <span>5 seats</span>
                  <span>A/C</span>
                </div>
                <div className="price">
                  <strong>EGP {vehicle.price}</strong>
                  <small> / day</small>
                </div>
                <button className="button button-outline">View details</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="process" id="process">
        <div className="shell section">
          <div className="section-heading light">
            <div>
              <span className="eyebrow">NO ONLINE PAYMENT</span>
              <h2>Reserve in 4 steps</h2>
            </div>
          </div>
          <div className="steps">
            <article>
              <b>01</b>
              <h3>Choose car and dates</h3>
              <p>See available days and the estimated price.</p>
            </article>
            <article>
              <b>02</b>
              <h3>Send your request</h3>
              <p>Enter your details and upload the required documents safely.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Sales review</h3>
              <p>The Rahal team reviews the request and notifies you.</p>
            </article>
            <article>
              <b>04</b>
              <h3>Confirm at the branch</h3>
              <p>Attend the branch, pay the deposit, and sign the rental documents.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="branch shell section" id="branch">
        <div>
          <span className="eyebrow">RAHAL BRANCH</span>
          <h2>Pickup and return at our branch</h2>
          <p>Final address details will be confirmed by the owner before production.</p>
        </div>
        <div className="contact">
          <a href="tel:01011105159">010 111 05159</a>
          <a href="tel:01113999155">011 13999 155</a>
        </div>
      </section>

      <footer>
        <div className="shell">
          <strong>RAHAL | رحال</strong>
          <span>Demo version — all displayed vehicles and records are fictional.</span>
        </div>
      </footer>
    </main>
  );
}
