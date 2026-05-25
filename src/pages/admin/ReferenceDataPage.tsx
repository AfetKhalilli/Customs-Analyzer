import React from 'react';
import { useDataStore } from '../../store/dataStore';
import { Tabs } from '../../components/ui/Primitives';
import { toast } from '../../store/toastStore';
import {
  HS_CODE_DB, COUNTRY_RISK, COMMODITY_CLASSIFICATIONS, BROKER_PROFILES, RISK_RULES,
} from '../../lib/referenceData';
import { Save } from 'lucide-react';
import type { AIScoreBand } from '../../types';

export function ReferenceDataPage() {
  const thresholds = useDataStore((s) => s.thresholds);
  const updateThresholds = useDataStore((s) => s.updateThresholds);
  const [tab, setTab] = React.useState('rules');

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Referans Məlumatlar</h1>
          <p className="text-muted">HS kodları, ölkə riski, mal kateqoriyaları, brokerlər və risk qaydaları</p>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'rules',      label: 'Risk qaydaları',     count: RISK_RULES.length },
          { value: 'thresholds', label: 'Skor hədləri' },
          { value: 'hs',         label: 'HS kodları',         count: HS_CODE_DB.length },
          { value: 'countries',  label: 'Ölkə riski',         count: COUNTRY_RISK.length },
          { value: 'commodity',  label: 'Mal kateqoriyaları', count: COMMODITY_CLASSIFICATIONS.length },
          { value: 'brokers',    label: 'Brokerlər',          count: BROKER_PROFILES.length },
        ]}
      />

      {tab === 'rules' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Kod</th><th>Ad</th><th>Kateqoriya</th><th>Çəki</th><th>Şiddət</th><th>Aktiv</th></tr>
              </thead>
              <tbody>
                {RISK_RULES.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td className="mono">{r.id}</td>
                    <td className="mono">{r.code}</td>
                    <td>
                      <b>{r.name}</b>
                      <div className="text-muted text-sm">{r.description}</div>
                    </td>
                    <td>{r.category}</td>
                    <td className="cell-num"><b>+{r.weight}</b></td>
                    <td>{r.severity}</td>
                    <td>{r.active ? '✓' : '×'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'thresholds' && (
        <ThresholdEditor
          bands={thresholds.scoreBands}
          slaHoursReview={thresholds.slaHoursReview}
          highValueAZN={thresholds.highValueAZN}
          lowUnitPriceAZN={thresholds.lowUnitPriceAZN}
          onSave={(next) => { updateThresholds(next); toast.success('Hədlər yeniləndi'); }}
        />
      )}

      {tab === 'hs' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>HS Kodu</th><th>Mal</th><th>Qrup</th><th>Tariff %</th><th>VAT %</th><th>Risk</th><th>Nəzarət</th><th>Vahid</th></tr></thead>
            <tbody>
              {HS_CODE_DB.map((h) => (
                <tr key={h.code} style={{ cursor: 'default' }}>
                  <td className="mono">{h.code}</td>
                  <td><b>{h.label}</b></td>
                  <td>{h.commodityGroup}</td>
                  <td className="cell-num">{h.tariffRate}%</td>
                  <td className="cell-num">{h.vatRate}%</td>
                  <td>{h.riskTier}</td>
                  <td>{h.controls.join(', ') || '—'}</td>
                  <td>{h.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'countries' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>Kod</th><th>Ölkə</th><th>Risk</th><th>Sanksiya</th><th>Səbəb</th></tr></thead>
            <tbody>
              {COUNTRY_RISK.map((c) => (
                <tr key={c.code} style={{ cursor: 'default' }}>
                  <td className="mono">{c.code}</td>
                  <td><b>{c.name}</b></td>
                  <td>{c.tier}</td>
                  <td>{c.sanctioned ? 'Bəli' : 'Xeyr'}</td>
                  <td>{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'commodity' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>HS prefiksi</th><th>Qrup</th><th>Nəzarət</th></tr></thead>
            <tbody>
              {COMMODITY_CLASSIFICATIONS.map((c) => (
                <tr key={c.prefix} style={{ cursor: 'default' }}>
                  <td className="mono">{c.prefix}</td>
                  <td><b>{c.group}</b></td>
                  <td>{c.controls.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'brokers' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>ID</th><th>Ad</th><th>Lisenziya</th><th>Qeydiyyat</th><th>Reytinq</th><th>Aşkarlanmış pozuntular</th></tr></thead>
            <tbody>
              {BROKER_PROFILES.map((b) => (
                <tr key={b.id} style={{ cursor: 'default' }}>
                  <td className="mono">{b.id}</td>
                  <td><b>{b.name}</b></td>
                  <td className="mono">{b.licenseNumber}</td>
                  <td>{b.registeredAt}</td>
                  <td>{b.riskRating}</td>
                  <td className="cell-num">{b.flaggedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ThresholdEditor({ bands, slaHoursReview, highValueAZN, lowUnitPriceAZN, onSave }: {
  bands: AIScoreBand[];
  slaHoursReview: number; highValueAZN: number; lowUnitPriceAZN: number;
  onSave: (v: { scoreBands?: AIScoreBand[]; slaHoursReview?: number; highValueAZN?: number; lowUnitPriceAZN?: number }) => void;
}) {
  const [b, setB] = React.useState<AIScoreBand[]>(bands);
  const [sla, setSla] = React.useState(slaHoursReview);
  const [hv, setHv] = React.useState(highValueAZN);
  const [lp, setLp] = React.useState(lowUnitPriceAZN);

  return (
    <div className="card">
      <div className="card-body">
        <h3>Skor → Risk səviyyəsi → Seçicilik kanalı</h3>
        <p className="text-muted text-sm">Bu hədlər bütün AI qiymətləndirməsinə tətbiq olunur.</p>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead><tr><th>Səviyyə</th><th>Min</th><th>Max</th><th>Kanal</th><th>Etiket</th></tr></thead>
            <tbody>
              {b.map((band, i) => (
                <tr key={band.band} style={{ cursor: 'default' }}>
                  <td><b>{band.band}</b></td>
                  <td>
                    <input className="input" type="number" value={band.min}
                      onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x))} style={{ width: 90, height: 32 }} />
                  </td>
                  <td>
                    <input className="input" type="number" value={band.max}
                      onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, max: Number(e.target.value) } : x))} style={{ width: 90, height: 32 }} />
                  </td>
                  <td>
                    <select className="select" value={band.channel}
                      onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, channel: e.target.value as any } : x))} style={{ width: 130, height: 32 }}>
                      <option value="GREEN">GREEN</option>
                      <option value="YELLOW">YELLOW</option>
                      <option value="RED">RED</option>
                    </select>
                  </td>
                  <td>{band.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divider" />
        <h3>Digər hədlər</h3>
        <div className="form-row cols-3">
          <div className="form-group">
            <label className="label">SLA həddi (saat)</label>
            <input className="input" type="number" value={sla} onChange={(e) => setSla(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="label">Yüksək dəyər həddi (AZN)</label>
            <input className="input" type="number" value={hv} onChange={(e) => setHv(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="label">Aşağı vahid qiymət (AZN/ədəd)</label>
            <input className="input" type="number" value={lp} onChange={(e) => setLp(Number(e.target.value))} />
          </div>
        </div>

        <div className="text-right">
          <button className="btn" onClick={() => onSave({ scoreBands: b, slaHoursReview: sla, highValueAZN: hv, lowUnitPriceAZN: lp })}>
            <Save size={14} /> Yadda saxla
          </button>
        </div>
      </div>
    </div>
  );
}
