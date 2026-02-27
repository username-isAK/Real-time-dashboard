import { useState, useEffect, useRef } from "react";

export default function WidgetItem({ widget, onUpdate, onDelete }) {
  const [text, setText] = useState(widget.content?.text || "");
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isFirstRender = useRef(true);

  useEffect(() => {
    setText(widget.content?.text || "");
    setConflict(false);
  }, [widget.content]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      if (text !== widget.content?.text) {
        setSaving(true);
        const success = await onUpdate(widget.id, { text });

        if (success === false) {
          setConflict(true);
        } else {
          setConflict(false);
        }

        setSaving(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [text, widget.content, widget.id, onUpdate]);

  function timeAgo(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString + "Z");
    const diff = Date.now() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  }

  const handleRefresh = () => {
    setText(widget.content?.text || "");
    setConflict(false);
  };

  return (
    <li className="bg-gray-50 p-4 rounded-lg space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`w-full border p-2 rounded-lg focus:ring-2 outline-none ${
          conflict ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
        }`}
        placeholder="Type here..."
      />

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 mt-1">
          {saving
            ? "Saving..."
            : conflict
            ? "⚠️ Conflict! Reload to see latest"
            : `Saved • v${widget.version} • ${timeAgo(widget.updated_at)}`}
        </div>

        <div className="flex gap-2">
          {conflict && (
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition cursor-pointer text-xs"
            >
              Refresh
            </button>
          )}
          <button
            onClick={() => onDelete(widget.id)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}