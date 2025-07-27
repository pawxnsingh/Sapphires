// components/Community.tsx
export default function Community() {
    const items = Array.from({ length: 12 }, (_, i) => ({
      title: `Project ${i + 1}`,
      subtitle: `${Math.floor(Math.random() * 300) + 1} Remixes`,
    }));
  
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">From the Community</h2>
          <button className="text-gray-600 text-sm hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="bg-gray-100 rounded-lg h-40"></div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <button className="px-6 py-2 bg-gray-100 rounded-full text-sm hover:bg-gray-200">
            Show More
          </button>
        </div>
      </div>
    );
  }
  