import { Clock } from "lucide-react";

export default function HistoryList({ items }) {
  return (
    <aside className="bg-white border border-leaf-soft rounded-2xl p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-4 text-canopy-dark/60">
        <Clock size={14} />
        <h3 className="text-sm font-medium">Recent scans</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-canopy-dark/40">No scans yet this session.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              {item.thumb ? (
                <img src={item.thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-leaf-soft" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-leaf-soft/60 flex items-center justify-center text-xs text-canopy-light font-bold">
                  {item.cropType?.[0]?.toUpperCase() || "L"}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-canopy-dark truncate">
                  {item.recommended_action?.replaceAll("_", " ")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-canopy-dark/40 capitalize">{item.cropType}</span>
                  {item.confidence && (
                    <span className="text-[10px] text-leaf bg-leaf-soft px-1.5 py-0.5 rounded-full">
                      {Math.round(item.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
