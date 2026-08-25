function Navbar() {
  const scrollToReport = () => {
    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="navbar">
      <a href="#home" className="logo">
        <div className="logo-icon">R</div>

        <span>
          Road<span>Wise</span>
        </span>
      </a>

      <div className="nav-links">
        <a href="#home">Home</a>
        <a href="#how-it-works">How it works</a>
        <a href="#impact">Impact</a>
      </div>

      <button className="nav-button" onClick={scrollToReport}>
        Report Issue
      </button>
    </nav>
  );
}

export default Navbar;
