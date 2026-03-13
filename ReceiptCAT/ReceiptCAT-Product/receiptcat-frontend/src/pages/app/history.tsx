// src/pages/app/history.tsx
import AppLayout from '../../layouts/AppLayout'
import RequireAuth from "../../components/RequireAuth";
import { useReceiptHistory } from "../../features/useReceiptHistory";
import ReceiptCard from "../../components/ReceiptCard";
import s from './History.module.css';
import DashboardGrid from '../../components/DashboardGrid';

export default function HistoryPage() {
  const { loading, error, receipts, summary } = useReceiptHistory();

  if (loading) return <div aria-live="polite">Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <RequireAuth>
      <AppLayout>
        <div className={s.container}>
          <section className={s.hero}>
            {/* total (top)  and stats on the right */}
            <div className={s.historyTopline}>
              <div className={s.topLeft}>
                <div className={s.total}>${summary.totalCost.toFixed(2)}</div> 
                <div className={s.month}>Total Cost</div>
              </div>
              <div className={s.stats}>
                <div className={s.statBox}>
                  <div className={s.statValue}>{summary.totalItems}</div>
                  <div className={s.statLabel}>Items</div>
                </div>
                <div className={s.statBox}>
                  <div className={s.statValue}>{summary.totalReceipts}</div>
                  <div className={s.statLabel}>Receipts</div>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <hr className={s.divider} />

          {!loading && !error && receipts.length === 0 && (
            <div style={{ padding: 16 }}>No receipts yet.</div>
          )}

          {/* receipt list */}
          <DashboardGrid>
            {receipts.map((r) => (
              <ReceiptCard key={r.receiptId} receipt={r} />
            ))}
          </DashboardGrid>
        </div>
      </AppLayout>
    </RequireAuth>
  )
}
