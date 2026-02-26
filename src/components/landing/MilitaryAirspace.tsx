export default function MilitaryAirspace() {
  return (
    <section className="lp-airspace" aria-label="Military airspace authorization">
      <div className="lp-container">
        <h2 className="lp-section-title">FLYING IN RESTRICTED AIRSPACE</h2>
        <p className="lp-airspace-lead">
          Hampton Roads has some of the most complex restricted airspace in the country. Norfolk Naval Station, the world's largest naval base, sits at the heart of the service area. NAS Oceana serves as the master jet base for the Atlantic Fleet. Langley Air Force Base anchors the eastern edge. Most drone operators avoid these corridors entirely. Sentinel flies them routinely.
        </p>
        <div className="lp-airspace-grid">
          <div className="lp-airspace-card">
            <h3>NORFOLK NAVAL STATION</h3>
            <p>The world's largest naval base. Class D and Class C airspace surrounds the installation. LAANC authorization is required for any commercial flight within the grid. Sentinel maintains active authorization.</p>
          </div>
          <div className="lp-airspace-card">
            <h3>NAS OCEANA</h3>
            <p>Master jet base for the Atlantic Fleet. F-18 training operations run year round. The airspace surrounding Oceana is among the most actively managed in the country. Every flight near this installation requires coordination and LAANC approval.</p>
          </div>
          <div className="lp-airspace-card">
            <h3>LANGLEY AIR FORCE BASE</h3>
            <p>Home to the 1st Fighter Wing and Air Combat Command. The airspace extends across Hampton and the surrounding area. Sentinel has operated in this corridor since launch.</p>
          </div>
        </div>
        <p className="lp-airspace-cta-text">
          Dr. Pierce flew missions as an Army Captain for nine years. The planning discipline that comes with that background is not something you learn from a weekend certification course. Your property gets the same level of mission analysis that a military operation would receive.
        </p>
      </div>
    </section>
  );
}
