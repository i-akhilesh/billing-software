import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Cloud, RefreshCw, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const SyncStatusBadge = () => {
    const { syncStatus, isOnline, lastSyncedAt, hasPendingWrites, forceSync } = useData();
    const [isSyncingManual, setIsSyncingManual] = useState(false);
    const [showPopover, setShowPopover] = useState(false);

    const handleManualSync = async () => {
        setIsSyncingManual(true);
        try {
            await forceSync();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSyncingManual(false);
        }
    };

    const getStatusDetails = () => {
        if (!isOnline || syncStatus === 'offline') {
            return {
                label: 'Offline',
                sublabel: 'Local changes will sync when online',
                color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                icon: <WifiOff className="h-4 w-4 text-amber-500" />,
                pulse: false
            };
        }
        if (syncStatus === 'syncing' || isSyncingManual || hasPendingWrites) {
            return {
                label: 'Syncing...',
                sublabel: 'Uploading changes to Cloud',
                color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                icon: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
                pulse: true
            };
        }
        if (syncStatus === 'error') {
            return {
                label: 'Sync Issue',
                sublabel: 'Click to retry connection',
                color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                icon: <AlertCircle className="h-4 w-4 text-red-500" />,
                pulse: false
            };
        }
        return {
            label: 'Synced',
            sublabel: 'All data synchronized with Cloud',
            color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
            pulse: false
        };
    };

    const details = getStatusDetails();

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setShowPopover(!showPopover)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 hover:shadow-sm ${details.color}`}
                title="Data Synchronization Status"
            >
                {details.icon}
                <span className="hidden sm:inline">{details.label}</span>
                {details.pulse && (
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                )}
            </button>

            {showPopover && (
                <>
                    <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowPopover(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-30 text-xs transition-all animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                                <Cloud className="h-4 w-4 text-indigo-500" />
                                <span>Real-Time Sync</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${details.color}`}>
                                {details.label}
                            </span>
                        </div>

                        <p className="text-gray-500 dark:text-gray-400 mb-3">
                            {details.sublabel}
                        </p>

                        {lastSyncedAt && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
                                Last synced: {format(lastSyncedAt, 'HH:mm:ss')}
                            </div>
                        )}

                        <button
                            onClick={handleManualSync}
                            disabled={isSyncingManual}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingManual ? 'animate-spin' : ''}`} />
                            <span>{isSyncingManual ? 'Syncing...' : 'Sync Now'}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default SyncStatusBadge;
