const people = [
  { className: "person-one", color: "#ffb84a", hair: "#332b39" },
  { className: "person-two", color: "#5ed3c6", hair: "#f06f4f" },
  { className: "person-three", color: "#9b7cff", hair: "#2e3152" },
  { className: "person-four", color: "#ff7599", hair: "#f7d36b" },
  { className: "person-five", color: "#71a7ff", hair: "#332b39" },
];

const photos = ["yellow", "pink", "blue", "green", "orange", "purple", "mint", "coral", "lilac"];

function StickPerson({ className, color, hair }: { className: string; color: string; hair: string }) {
  return (
    <div className={`stick-person ${className}`} aria-hidden="true">
      <span className="stick-hair" style={{ backgroundColor: hair }} />
      <span className="stick-head"><i /><b /></span>
      <span className="stick-body" style={{ backgroundColor: color }} />
      <span className="stick-arm stick-arm-left" />
      <span className="stick-arm stick-arm-right" />
      <span className="stick-leg stick-leg-left" />
      <span className="stick-leg stick-leg-right" />
    </div>
  );
}

function Phone({ className }: { className: string }) {
  return (
    <span className={`mini-phone ${className}`} aria-hidden="true">
      <span className="phone-screen"><i /><b /></span>
    </span>
  );
}

function PhotoCard({ color, index }: { color: string; index: number }) {
  return (
    <span className={`photo-card photo-${index + 1} photo-card-${color}`} aria-hidden="true">
      <i className="photo-sun" />
      <b className="photo-person photo-person-a" />
      <b className="photo-person photo-person-b" />
      <em />
    </span>
  );
}

export default function MemoraHeroAnimation() {
  return (
    <div className="memora-animation" aria-label="A short animation showing friends taking photos that come together in Memora">
      <div className="animation-topline"><span>MEMORA</span><i>LIVE EVENT</i></div>
      <div className="event-stage">
        <span className="stage-spark spark-one" />
        <span className="stage-spark spark-two" />
        <span className="stage-floor" />
        {people.map((person) => <StickPerson key={person.className} {...person} />)}
        <Phone className="phone-one" />
        <Phone className="phone-two" />
        <Phone className="phone-three" />
        <span className="camera-flash flash-one" />
        <span className="camera-flash flash-two" />
        <div className="photo-stream">
          {photos.map((color, index) => <PhotoCard key={color} color={color} index={index} />)}
        </div>
        <div className="gallery-grid">
          {photos.map((color, index) => <PhotoCard key={`gallery-${color}`} color={color} index={index} />)}
        </div>
        <div className="memora-mark">
          <strong>memora</strong>
          <span>Shared moments. Lasting memories.</span>
          <b>See the memories →</b>
        </div>
        <span className="share-arrow">↗</span>
        <span className="share-dot share-dot-one" />
        <span className="share-dot share-dot-two" />
      </div>
      <div className="animation-caption"><span>Everyone has a moment.</span><strong>Memora brings them together.</strong></div>
    </div>
  );
}
