/* global React */

const { useState, useEffect, useRef } = React;

function CommandPalette({ onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const commands = [
    { id: "mode-dash", label: "Switch Mode: Dashboard", action: () => setMode("Dashboard") },
    { id: "mode-work", label: "Switch Mode: Work", action: () => setMode("Work") },
    { id: "mode-comms", label: "Switch Mode: Comms", action: () => setMode("Comms") },
    { id: "mode-obs", label: "Switch Mode: Observe", action: () => setMode("Observe") },
    { id: "mode-cog", label: "Switch Mode: Cognition", action: () => setMode("Cognition") },
    { id: "mode-ide", label: "Switch Mode: IDE", action: () => setMode("IDE") },
    { id: "repo-switch", label: "Change Repository...", action: () => alert("Not implemented yet") },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (cmd) => {
    setOpen(false);
    setQuery("");
    if (onSelect) onSelect(cmd);
  };

  return (
    <div className="cmd-palette-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <input 
          ref={inputRef}
          type="text" 
          placeholder="Type a command..." 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
        />
        <div className="cmd-list">
          {filtered.map(cmd => (
            <div key={cmd.id} className="cmd-item" onClick={() => handleSelect(cmd)}>
              {cmd.label}
            </div>
          ))}
          {filtered.length === 0 && <div className="cmd-empty">No commands found.</div>}
        </div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
