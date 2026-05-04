export default function BrandPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#3D5C45" }}
    >
      <div className="text-center">
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "0.06em",
          lineHeight: 1,
          fontFamily: "'Trebuchet MS', sans-serif",
          textTransform: "uppercase",
        }}>
          SNEL<span style={{ opacity: 0.55, marginLeft: "0.12em" }}>VINK</span>
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.45)",
          letterSpacing: "0.2em",
          marginTop: 12,
          textTransform: "uppercase",
        }}>
          SnelVink
        </div>
      </div>
    </div>
  );
}
