export default function ServiceArea() {
  return (
    <section className="lp-service-area" aria-label="Service area" id="service-area">
      <div className="lp-container">
        <h2 className="lp-section-title">WHERE WE OPERATE</h2>
        <p className="lp-service-area-lead">
          All of Hampton Roads is covered. Virginia Beach, Norfolk, Chesapeake, Portsmouth, Newport News, Hampton, Suffolk, and Williamsburg. Service extends into Maryland and Northern North Carolina. If your property is in this region, we can fly it.
        </p>
        <div className="lp-service-area-grid">
          <div className="lp-service-area-region">
            <h3>HAMPTON ROADS</h3>
            <ul>
              <li>Virginia Beach</li>
              <li>Norfolk</li>
              <li>Chesapeake</li>
              <li>Portsmouth</li>
              <li>Newport News</li>
              <li>Hampton</li>
              <li>Suffolk</li>
              <li>Williamsburg</li>
            </ul>
          </div>
          <div className="lp-service-area-region">
            <h3>EXTENDED COVERAGE</h3>
            <ul>
              <li>Maryland</li>
              <li>Northern North Carolina</li>
            </ul>
          </div>
          <div className="lp-service-area-region">
            <h3>AIRSPACE COVERAGE</h3>
            <ul>
              <li>Norfolk Naval Station</li>
              <li>NAS Oceana</li>
              <li>Langley Air Force Base</li>
              <li>Norfolk International Airport</li>
              <li>Newport News Airport</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
