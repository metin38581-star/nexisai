import BackgroundGlow from "@/components/layout/BackgroundGlow";
import CorporateFooter from "@/components/layout/CorporateFooter";
import Navbar from "@/components/layout/Navbar";
import HomeLanding from "@/components/dashboard/HomeLanding";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-black text-white">
      <BackgroundGlow />
      <Navbar />
      <main className="relative z-10 flex-1">
        <HomeLanding />
      </main>
      <CorporateFooter />
    </div>
  );
}
