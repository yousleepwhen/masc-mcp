/* global React */
// Phase A: Tool Window System (VSCode-style Activity Bar)
const { useState } = React;

function ActivityBar({ side, activeTab, onTabClick, tabs }) {
  return (
    <div className={`activity-bar activity-bar-${side}`}>
      <div className="ab-top">
        {tabs.map(t => (
          <button 
            key={t.id} 
            className={`ab-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => onTabClick(t.id)}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div className="ab-spacer" style={{flex: 1}} />
      <div className="ab-bottom">
        <button className="ab-tab ab-settings" title="Settings">⚙</button>
      </div>
    </div>
  );
}
window.ActivityBar = ActivityBar;
