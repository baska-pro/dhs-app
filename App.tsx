import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, DailyLog, UserLevel } from './types.ts';
import { storage } from './services/storage.ts';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import Checklist from './components/Checklist.tsx';
import Stats from './components/Stats.tsx';
import Profile from './components/Profile.tsx';
import { LEVEL_CONFIG } from './constants.tsx';
import { Toast, InAppBanner } from './components/Modal.tsx';
import { audio } from './services/audio.ts';
import { notifications, InAppNotificationEvent } from './services/notifications.ts';
import { cloudSync } from './services/cloudSync.ts';
import { toLocalDateKey } from './utils/date.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<UserProfile>(storage.getUser());
  const [logs, setLogs] = useState<Record<string, DailyLog>>(storage.getLogs());
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [inAppAlert, setInAppAlert] = useState<InAppNotificationEvent | null>(null);

  const [today, setToday] = useState(() => toLocalDateKey());

  // Keep the active local calendar day correct when the app stays open across midnight.
  useEffect(() => {
    const refreshDate = () => {
      const current = toLocalDateKey();
      setToday((previous) => previous === current ? previous : current);
    };
    const timer = window.setInterval(refreshDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Subscribe to In-App Notification Alerts (foreground / fallback)
  useEffect(() => {
    const unsubscribe = notifications.subscribe((event) => {
      setInAppAlert(event);
    });
    return unsubscribe;
  }, []);

  // Check URL hash on initial load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('tab=')) {
      const tab = hash.split('tab=')[1];
      if (['home', 'checklist', 'stats', 'profile'].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  // Listen to Service Worker messages (e.g., when notification clicked)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE_TAB') {
          if (['home', 'checklist', 'stats', 'profile'].includes(event.data.tab)) {
            setActiveTab(event.data.tab);
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

  // Initialize service worker and sync notifications schedule
  useEffect(() => {
    notifications.initServiceWorker();

    // Get location or default Jakarta for prayer schedule calculation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          notifications.scheduleAll(user, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          notifications.scheduleAll(user);
        },
        { timeout: 5000 }
      );
    } else {
      notifications.scheduleAll(user);
    }
  }, [user.notifications, user.prayerOffsets]);

  const getTodayLog = useCallback((currentLogs: Record<string, DailyLog>): DailyLog => {
    if (currentLogs[today]) return currentLogs[today];
    return {
      date: today,
      prayers: {},
      sunnah: [],
      waterLitres: 0,
      physical: [],
      diet: [],
      productivity: [],
      social: [],
      digital: [],
      cleanliness: [],
      sleep: [],
      customHabits: [],
      points: 0,
      notes: ''
    };
  }, [today]);

  const [todayLog, setTodayLog] = useState<DailyLog>(getTodayLog(logs));

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    const freshLogs = storage.getLogs();
    const currentLog = getTodayLog(freshLogs);
    setTodayLog(currentLog);
    setLogs(freshLogs);

    const lastActiveDate = user.lastActive;
    if (lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = toLocalDateKey(yesterday);

      let newStreak = user.streak;
      if (!user.isHolidayMode) {
        if (lastActiveDate !== yesterdayStr && lastActiveDate !== today) {
          newStreak = 0;
        }
      }

      const updatedUser = { ...user, lastActive: today, streak: newStreak };
      setUser(updatedUser);
      storage.saveUser(updatedUser);
    }
  }, [today]);

  const updateTodayLog = (newLog: DailyLog) => {
    setTodayLog(newLog);
    const newLogs = { ...logs, [today]: newLog };
    setLogs(newLogs);
    storage.saveLog(newLog);

    const totalPoints = (Object.values(newLogs) as DailyLog[]).reduce((sum: number, l: DailyLog) => sum + l.points, 0);

    let newLevel = user.level;
    const levels = [UserLevel.MUBTADI, UserLevel.MUQTASID, UserLevel.MUHSIN, UserLevel.SABIQ];
    for (const l of [...levels].reverse()) {
      if (totalPoints >= LEVEL_CONFIG[l].threshold) {
        newLevel = l;
        break;
      }
    }

    if (newLevel > user.level) {
      audio.playLevelUp();
      showToast(`🎉 Mabruk! Kamu naik level ke ${LEVEL_CONFIG[newLevel].name}!`, 'success');
    }

    let newStreak = user.streak;
    if (newLog.points > 0 && user.streak === 0) {
      newStreak = 1;
    }

    const updatedUser = { ...user, totalPoints, level: newLevel, streak: newStreak, lastActive: today };
    setUser(updatedUser);
    storage.saveUser(updatedUser);
    cloudSync.triggerAutoSync(updatedUser);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard user={user} todayLog={todayLog} onNavigate={setActiveTab} />;
      case 'checklist':
        return <Checklist log={todayLog} userLevel={user.level} onUpdate={updateTodayLog} />;
      case 'stats':
        return <Stats logs={logs} />;
      case 'profile':
        return (
          <Profile
            user={user}
            onUpdate={(u) => {
              setUser(u);
              storage.saveUser(u);
              cloudSync.triggerAutoSync(u);
            }}
            showToast={showToast}
          />
        );
      default:
        return <Dashboard user={user} todayLog={todayLog} onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {inAppAlert && (
        <InAppBanner
          title={inAppAlert.title}
          body={inAppAlert.body}
          tab={inAppAlert.tab}
          type={inAppAlert.type}
          onAction={() => {
            if (inAppAlert.tab) {
              setActiveTab(inAppAlert.tab);
            }
          }}
          onClose={() => setInAppAlert(null)}
        />
      )}
    </Layout>
  );
};

export default App;
