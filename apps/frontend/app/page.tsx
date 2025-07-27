import HeroImage from "../public/hero.webp";
import Navbar from "@/components/Header";
import { AiChat } from "@/components/AiChat"
import ChooseUsSection from "@/components/ChooseUsSection";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div>
        <img src={HeroImage.src} alt="background gradient" width="100%"/>
      </div>

      {/* your content */}
      <div className="absolute inset-0 z-20 flex flex-col">
        <Navbar />

        

        <div className="flex-1 flex items-center justify-center text-center px-6">
          <AiChat />
        </div>
      </div>

      <ChooseUsSection />
    </div>
  );
}
