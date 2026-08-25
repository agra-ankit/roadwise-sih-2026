function Stats() {
  const stats = [
    ["1.2K+", "Reports submitted"],
    ["840+", "Issues resolved"],
    ["52", "Roads improved"],
    ["94%", "Citizen satisfaction"],
  ];

  return (
    <section className="stats-section" id="impact">
      {stats.map(([number, label]) => (
        <div className="stat" key={label}>
          <strong>{number}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

export default Stats;
