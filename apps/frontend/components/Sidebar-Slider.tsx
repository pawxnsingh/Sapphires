"use client";

import { useState } from "react";

export default function ClientSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger + tooltip */}
      <div className="relative group inline-block">
        {/* Main button (glass) */}
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2
                  bg-wh ite/10 backdrop-blur-md
                  text-white font-semibold text-base
                  px-4 py-2 rounded-full
                  cursor-pointer transition-all duration-300
                  hover:bg-white/20"
        >
          <span className="text-white text-xl">❖</span>
          <span>my sites</span>
          <span className="ml-1">→</span>
        </button>

        {/* Tooltip */}
        <div
          className="absolute left-1/2 top-full mt-3
                  transform -translate-x-1/2
                  opacity-0 group-hover:opacity-100
                  pointer-events-none
                  transition-opacity duration-300"
        >
          {/* Arrow */}
          <div className="flex justify-center">
            <div
              className="w-2.5 h-2.5
                      bg-white/10 
                      rotate-45 -mb-1"
            ></div>
          </div>

          {/* Bubble */}
          <div
            className="bg-white/10 backdrop-blur-md 
                    text-white text-xs
                    px-4 py-1.5 rounded-full
                    shadow-sm whitespace-nowrap"
          >
            See past projects
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50
          transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={() => setIsOpen(false)}
      />

      {/* Sliding Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 w-64
          bg-white/10 backdrop-blur-md border-r border-white/20
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-[100%]"}
        `}
      >
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">My Sites</h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
            className="text-white text-2xl"
          >
            ×
          </button>
        </div>


        {/* i have to do the network call to get all the projects */}
        <nav className="px-4 space-y-2">
          <a
            href="#"
            className="block px-2 py-1 rounded hover:bg-white/20 text-white"
          >
            Site One
          </a>
          <a
            href="#"
            className="block px-2 py-1 rounded hover:bg-white/20 text-white"
          >
            Site Two
          </a>
          <a
            href="#"
            className="block px-2 py-1 rounded hover:bg-white/20 text-white"
          >
            Site Three
          </a>
        </nav>
      </div>
    </>
  );
}
