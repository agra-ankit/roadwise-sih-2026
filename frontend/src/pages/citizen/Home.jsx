import Navbar from "../../components/citizen/Navbar";
import Hero from "../../components/citizen/Hero";
import Stats from "../../components/citizen/Stats";
import HowItWorks from "../../components/citizen/HowItWorks";
import ReportForm from "../../components/citizen/ReportForm";
import TrackReport from "../../components/citizen/TrackReport";
import CTA from "../../components/citizen/CTA";
import Footer from "../../components/citizen/Footer";

function Home() {
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
        <TrackReport />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

export default Home;