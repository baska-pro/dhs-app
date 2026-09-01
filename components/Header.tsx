
import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour12: false });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="px-5 pt-6 pb-2 space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tighter text-slate-900 transition-colors">
          {formatTime(time).split(':').map((unit, idx) => (
            <React.Fragment key={idx}>
              <span className={idx === 2 ? "text-teal-500 font-medium text-2xl" : ""}>{unit}</span>
              {idx < 2 && <span className="text-teal-200 mx-0.5 animate-pulse">:</span>}
            </React.Fragment>
          ))}
        </span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
        {formatDate(time)}
      </p>
    </div>
  );
};

export default Header;
