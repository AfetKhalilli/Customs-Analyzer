import React from 'react';
import { useDataStore } from '../../store/dataStore';
import { Tabs } from '../../components/ui/Primitives';
import { toast } from '../../store/toastStore';
import { COUNTRY_RISK, BROKER_PROFILES, RISK_RULES } from '../../lib/referenceData';
import { HS_CODES, HS_CATEGORIES } from '../../lib/hsCodes';
import { CATEGORY_PRICE_BANDS } from '../../lib/pricingReference';
import { Save } from 'lucide-react';
import { RISK_LEVEL_LABEL, CHANNEL_LABEL } from '../../lib/i18n';
import type { AIScoreBand, RiskLevel } from '../../types';

export function ReferenceDataPage() {
  const thresholds = useDataStore((s) => s.thresholds);
  const updateThresholds = useDataStore((s) => s.updateThresholds);
  const [tab, setTab] = React.useState('rules');

  return (
    <div>
      <div className="section-header">
        <div>
          <h1>Risk və Qayda Reyestri</h1>
          <p className="text-muted">Risk qaydaları, skor hədləri, HS kodları, ölkə riski, qiymət bandları və broker reyestri — gömrük və PCA auditi üçün vahid mənbə</p>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'rules',      label: 'Risk qaydaları',     count: RISK_RULES.length },
          { value: 'thresholds', label: 'Skor hədləri' },
          { value: 'hs',         label: 'HS kodları',         count: HS_CODES.length },
          { value: 'countries',  label: 'Ölkə riski',         count: COUNTRY_RISK.length },
          { value: 'pricing',    label: 'Qiymət hədləri',     count: CATEGORY_PRICE_BANDS.length },
          { value: 'brokers',    label: 'Brokerlər',          count: BROKER_PROFILES.length },
        ]}
      />

      {tab === 'rules' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr><th>Qayda №</th><th>Kod</th><th>Ad</th><th>Kateqoriya</th><th className="cell-num">Çəki</th><th>Şiddət</th><th>Aktiv</th></tr>
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
                    <td>{({ critical: 'Kritik', warning: 'Xəbərdarlıq', info: 'Məlumat' } as Record<string, string>)[r.severity] ?? r.severity}</td>
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
            <thead>
              <tr>
                <th>HS Kodu</th><th>Mal Adı</th><th>Kateqoriya</th>
                <th className="cell-num">Rüsum Dərəcəsi %</th>
                <th className="cell-num">ƏDV %</th>
                <th>Risk Səviyyəsi</th>
                <th>Vahid</th>
                <th className="cell-num">Min Qiymət ₼</th>
                <th className="cell-num">Maks Qiymət ₼</th>
              </tr>
            </thead>
            <tbody>
              {HS_CODES.map((h) => (
                <tr key={h.code} style={{ cursor: 'default' }}>
                  <td className="mono">{h.code}</td>
                  <td><b>{h.label}</b></td>
                  <td>{h.category}</td>
                  <td className="cell-num">{h.tariffRate}%</td>
                  <td className="cell-num">{h.vatRate}%</td>
                  <td>{({ low: 'Aşağı', medium: 'Orta', high: 'Yüksək' } as Record<string, string>)[h.riskTier] ?? h.riskTier}</td>
                  <td>{h.unit}</td>
                  <td className="cell-num">{h.pricing.expectedMinAZN}</td>
                  <td className="cell-num">{h.pricing.expectedMaxAZN}</td>
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
                  <td>{({ low: 'Aşağı', medium: 'Orta', high: 'Yüksək' } as Record<string, string>)[c.tier] ?? c.tier}</td>
                  <td>{c.sanctioned ? 'Bəli' : 'Xeyr'}</td>
                  <td>{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead>
              <tr>
                <th>Kateqoriya</th>
                <th>Vahid</th>
                <th className="cell-num">Min ₼</th>
                <th className="cell-num">Maks ₼</th>
                <th className="cell-num">Şübhəli aşağı</th>
                <th className="cell-num">Şübhəli yüksək</th>
                <th className="cell-num">Risk əmsalı</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_PRICE_BANDS.map((b) => (
                <tr key={b.category} style={{ cursor: 'default' }}>
                  <td><b>{b.category}</b></td>
                  <td>{b.unit}</td>
                  <td className="cell-num">{b.expectedMinAZN}</td>
                  <td className="cell-num">{b.expectedMaxAZN}</td>
                  <td className="cell-num">{b.suspiciousLowAZN}</td>
                  <td className="cell-num">{b.suspiciousHighAZN}</td>
                  <td className="cell-num">{b.riskCoefficient.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-footer text-muted text-sm">
            Cəmi kateqoriya: {HS_CATEGORIES.length} · Qiymət bandı: {CATEGORY_PRICE_BANDS.length}
          </div>
        </div>
      )}

      {tab === 'brokers' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>Broker №</th><th>Ad</th><th>Lisenziya</th><th>Qeydiyyat</th><th>Reytinq</th><th className="cell-num">Aşkarlanmış Pozuntular</th></tr></thead>
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
        <h3>Risk Skoru → Risk Səviyyəsi → Seçicilik Dəhlizi</h3>
        <p className="text-muted text-sm">Bu hədlər bütün süni intellekt qiymətləndirməsinə tətbiq olunur.</p>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead><tr><th>Risk Səviyyəsi</th><th>Minimum Bal</th><th>Maksimum Bal</th><th>Seçicilik Dəhlizi</th><th>Etiket</th></tr></thead>
            <tbody>
              {b.map((band, i) => (
                <tr key={band.band} style={{ cursor: 'default' }}>
                  <td><b>{RISK_LEVEL_LABEL[band.band as RiskLevel] ?? band.band}</b></td>
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
                      onChange={(e) => setB(b.map((x, j) => j === i ? { ...x, channel: e.target.value as any } : x))} style={{ width: 150, height: 32 }}>
                      <option value="GREEN">{CHANNEL_LABEL.GREEN}</option>
                      <option value="YELLOW">{CHANNEL_LABEL.YELLOW}</option>
                      <option value="RED">{CHANNEL_LABEL.RED}</option>
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
