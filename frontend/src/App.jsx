import "./App.css";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import HowItWorks from "./components/HowItWorks";
import ReportForm from "./components/ReportForm";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="app">
      <div className="bg-glow glow-one"></div>
      <div className="bg-glow glow-two"></div>
      <div className="grid-bg"></div>

      <Navbar />

      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <ReportForm />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

export default App;
