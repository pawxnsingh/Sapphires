"use client";
// components/Hero.tsx
import { useState } from "react";
import { FiPaperclip, FiFigma, FiGlobe, FiSend } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";

export default function Hero() {
  const [prompt, setPrompt] = useState("");
  const { getToken } = useAuth();
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  return (
    <div className="max-w-4xl mx-auto text-center text-gray-900 space-y-6">
      <h1 className="text-5xl font-extrabold">
        Build something <span className="text-pink-500">♥</span> Lovable
      </h1>
      <p className="text-lg">
        Idea to app in seconds, with your personal full stack engineer
      </p>
      {/* Input Card */}
      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Lovable to create a landing page for ..."
          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        <div className="flex justify-between items-center text-gray-600">
          <div className="flex space-x-4">
            <button className="flex items-center gap-1">
              <FiPaperclip /> Attach
            </button>
            <button className="flex items-center gap-1">
              <FiFigma /> Import Figma
            </button>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center gap-1">
              <FiGlobe /> Public
            </button>
            <button
              className="flex items-center gap-1 hero-bg px-1.5 py-0.5 rounded-4xl text-white"
              onClick={async () => {
                // TODO: we need to hit our backend here!!
                const token = await getToken();
                console.log(`token is: ${token}`);

                const resp = await axios.post(
                  `${backend}/project`,
                  {
                    prompt: prompt,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                console.log(resp.data);
              }}
            >
              <FiSend /> SEND
            </button>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap justify-center gap-3">
        {[
          "Expense tracker",
          "3D product viewer",
          "Real estate listings",
          "Note taking app",
        ].map((tag) => (
          <span
            key={tag}
            className="text-sm bg-white/50 backdrop-blur-lg rounded-full px-4 py-2"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
