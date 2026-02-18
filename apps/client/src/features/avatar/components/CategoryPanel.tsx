import { useState, useEffect } from "react";
import { useAvatarStore } from "../../../store/avatarStore";
import { fetchManifest } from "../logic";
import type { AvatarManifest, AvatarItem, AvatarCategory } from "../logic";

export default function CategoryPanel() {
  const [manifest, setManifest] = useState<AvatarManifest | null>(null);
  const [activeTab, setActiveTab] = useState("body");
  const { body, outfit, hair, accessory, setPart } = useAvatarStore();

  const selected: Record<string, string> = { body, outfit, hair, accessory };

  useEffect(() => {
    fetchManifest().then(setManifest);
  }, []);

  if (!manifest) {
    return <div className="p-4 text-gray-400">Loading...</div>;
  }

  const activeCategory = manifest.categories.find(
    (c: AvatarCategory) => c.id === activeTab
  );
  const items = manifest.items[activeTab] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {manifest.categories.map((cat: AvatarCategory) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex-1 py-3 px-2 text-sm font-medium transition-colors ${
              activeTab === cat.id
                ? "text-white border-b-2 border-indigo-500 bg-gray-800"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          {activeCategory?.name}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {items.map((item: AvatarItem) => {
            const isSelected = selected[activeTab] === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPart(activeTab, item.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-gray-700 hover:border-gray-500 bg-gray-800/50"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-md border border-gray-600"
                  style={{
                    backgroundColor:
                      item.color === "transparent" ? "#374151" : item.color,
                  }}
                />
                <span className="text-xs text-gray-300 text-center leading-tight">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
