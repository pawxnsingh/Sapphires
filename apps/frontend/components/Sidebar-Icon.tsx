import { auth } from "@clerk/nextjs/server";
import ClientSidebar from "./Sidebar-Slider"

const Sidebar = async () => {
  const { userId } = await auth();

  if (!userId) {
    return <div className="text-white font-bold text-xl hover">Sapphires</div>;
  }

  return <ClientSidebar />

  // return (
    // <div className="relative group inline-block">
    //   {/* Main button (glass) */}
    //   <div
    //     className="flex items-center gap-2
    //               bg-wh ite/10 backdrop-blur-md
    //               text-white font-semibold text-base
    //               px-4 py-2 rounded-full
    //               cursor-pointer transition-all duration-300
    //               hover:bg-white/20"
    //   >
    //     <span className="text-white text-xl">❖</span>
    //     <span>my sites</span>
    //     <span className="ml-1">→</span>
    //   </div>

    //   {/* Tooltip */}
    //   <div
    //     className="absolute left-1/2 top-full mt-3
    //               transform -translate-x-1/2
    //               opacity-0 group-hover:opacity-100
    //               pointer-events-none
    //               transition-opacity duration-300"
    //   >
    //     {/* Arrow */}
    //     <div className="flex justify-center">
    //       <div
    //         className="w-2.5 h-2.5
    //                   bg-white/10 
    //                   rotate-45 -mb-1"
    //       ></div>
    //     </div>

    //     {/* Bubble */}
    //     <div
    //       className="bg-white/10 backdrop-blur-md 
    //                 text-white text-xs
    //                 px-4 py-1.5 rounded-full
    //                 shadow-sm whitespace-nowrap"
    //     >
    //       See past projects
    //     </div>
    //   </div>
    // </div>
  // );
};

export default Sidebar;
