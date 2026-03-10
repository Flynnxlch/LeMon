import { memo, useCallback, useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout/MainLayout';
import Card from '../components/common/Card/Card';
import Button from '../components/common/Button/Button';
import { useToast } from '../context/ToastContext';
import { useSettings, useUpdateReminder } from '../hooks/useQueries';
import { UPDATE_INTERVAL_OPTIONS } from '../utils/assetConstants';

const ReminderSettings = memo(() => {
  const toast = useToast();
  const [defaultUpdateIntervalDays, setDefaultUpdateIntervalDays] = useState(7);

  const { data: settings, isLoading: loading } = useSettings();
  const updateMutation = useUpdateReminder();

  useEffect(() => {
    if (settings?.defaultUpdateIntervalDays != null) {
      setDefaultUpdateIntervalDays(Number(settings.defaultUpdateIntervalDays));
    }
  }, [settings]);

  const handleSave = useCallback(() => {
    updateMutation.mutate(
      { defaultUpdateIntervalDays },
      {
        onSuccess: () => toast.success('Jangka waktu update reminder berhasil disimpan. Berlaku untuk semua cabang.'),
        onError: (err) => toast.error(err?.message || 'Gagal menyimpan.'),
      }
    );
  }, [defaultUpdateIntervalDays, updateMutation, toast]);

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Update Reminder Settings {/* Changed to English */}
        </h1>
        <p className="text-sm text-neutral-500">
          Atur jangka waktu update aset secara global. Nilai ini akan digunakan untuk Assign dan Update aset di semua cabang. Admin cabang tidak perlu mengatur jangka waktu sendiri.
        </p>
      </div>

      <Card title="Update Interval (Global)" subtitle="Digunakan saat Assign Asset dan Update Asset di cabang"> {/* Changed title to English */}
        {loading ? (
          <p className="text-neutral-500 py-4">Memuat pengaturan...</p>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Update Interval <span className="text-red-500">*</span> {/* Changed to English */}
              </label>
              <select
                value={defaultUpdateIntervalDays}
                onChange={(e) => setDefaultUpdateIntervalDays(Number(e.target.value))}
                className="block w-full max-w-xs px-4 py-2.5 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                {UPDATE_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="mt-2 text-sm text-neutral-500">
                Setelah assign atau update, due date berikutnya akan dihitung berdasarkan pilihan di atas.
              </p>
            </div>
            <div>
              <Button variant="primary" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </MainLayout>
  );
});

ReminderSettings.displayName = 'ReminderSettings';

export default ReminderSettings;
