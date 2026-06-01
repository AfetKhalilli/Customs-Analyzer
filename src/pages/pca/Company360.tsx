import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataStore } from '../../store/dataStore';
import { useCurrentUser } from '../../store/authStore';
import { Tabs, StatusBadge, RiskBadge, PCARiskBadge, EmptyState, Avatar } from '../../components/ui/Primitives';
import { formatDate, formatDateTime, formatCurrency, relativeTime, groupByDay } from '../../lib/utils';
import { Bookmark, ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from '../../store/toastStore';
import {
  FINDING_CATEGORY_LABEL, FINDING_STATUS_LABEL, ANOMALY_PATTERN_LABEL,
} from '../../lib/i18n';
import type { IndividualUser } from '../../types';

export function Company360() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const users = useDataStore((s) => s.users);
  const decls = useDataStore((s) => s.declarations);
  const cases = useDataStore((s) => s.pcaCases);
  const anomalies = useDataStore((s) => s.pcaAnomalies);
  const findings = useDataStore((s) => s.pcaFindings);
  const logs = useDataStore((s) => s.logs);
  const watchlists = useDataStore((s) => s.watchlists);
  const toggleWatchlist = useDataStore((s) => s.toggleWatchlist);
  const logPCAView = useDataStore((s) => s.logPCAView);

  const [tab, setTab] = React.useState('overview');
  const company = users.find((u) => u.id === id);
  if (!company) return <div className="card"><div className="card-body"><EmptyState title="Şirkət tapılmadı" /></div></div>;

  const companyName = company.entityType === 'individual' ? `${company.firstName} ${company.lastName}` : company.companyName;
  const companyDecls = decls.filter((d) => d.ownerId === id);
  const companyCases = cases.filter((c) => c.companyId === id);
  const companyAnomalies = anomalies.filter((a) => a.affectedCompanyIds.includes(id!));
  const companyFindings = findings.filter((f) => f.companyId === id);
  const inspectorsInvolved = Array.from(new Set(companyDecls.map((d) => d.assignedInspectorId).filter(Boolean))) as string[];

  const watch = watchlists.find((w) => w.auditorId === user.id);
  const isWatched = watch?.companyIds.includes(id!) ?? false;

  const toggle = () => {
    toggleWatchlist(user.id, id!);
    toast.success(isWatched ? 'Şirkət izləmə siyahısından çıxarıldı' : 'Şirkət izləmə siyahısına əlavə edildi');
  };

  const handleOpenDecl = (declId: string) => {
    logPCAView(declId, user);
    navigate(`/declaration/${declId}`);
  };

  const avgRisk = companyCases.length > 0 ? Math.round(companyCases.reduce((a, c) => a + c.riskScore, 0) / companyCases.length) : 0;
  const totalDuty = companyCases.reduce((a, c) => a + c.dutyAtRisk, 0);
  const companyLogs = logs.filter((l) => l.declarationId && companyDecls.some((d) => d.id === l.declarationId));

  return (
    <div>
      <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} /> Geri
      </button>

      <div className="card mb-3">
        <div className="card-body">
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <Avatar name={companyName} size="lg" />
            <div className="flex-1">
              <h1 style={{ marginBottom: 4 }}>{companyName}</h1>
              <div className="text-muted text-sm">
                {company.entityType === 'company' ? `VÖEN: ${(company as any).tin}` : `FIN: ${(company as IndividualUser).fin}`}
                {' · '}
                {company.entityType === 'company' ? (company as any).activityField : 'Fiziki şəxs'}
              </div>
            </div>
            <button className={`btn ${isWatched ? 'btn-warning' : 'btn-secondary'}`} onClick={toggle}>
              <Bookmark size={14} fill={isWatched ? 'currentColor' : 'none'} />
              {isWatched ? 'İzlənilir' : 'İzlə'}
            </button>
          </div>

          <div className="kpi-grid mt-3" style={{ marginBottom: 0 }}>
            <div className="kpi-card blue">
              <div className="kpi-label">Sənədlər</div>
              <div className="kpi-value">{companyDecls.length}</div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-label">Audit İşləri</div>
              <div className="kpi-value">{companyCases.length}</div>
            </div>
            <div className="kpi-card amber">
              <div className="kpi-label">Orta Risk Skoru</div>
              <div className="kpi-value">{avgRisk}</div>
            </div>
            <div className="kpi-card red">
              <div className="kpi-label">Risk Altında Rüsum</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalDuty)}</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview',     label: 'İcmal' },
          { value: 'declarations', label: 'Sənədlər', count: companyDecls.length },
          { value: 'documents',    label: 'Sənədlər' },
          { value: 'history',      label: 'Tarixçə' },
          { value: 'inspectors',   label: 'İnspektorlar', count: inspectorsInvolved.length },
          { value: 'anomalies',    label: 'Anomaliyalar', count: companyAnomalies.length },
          { value: 'findings',     label: 'Tapıntılar', count: companyFindings.length },
          { value: 'compare',      label: 'Müqayisə' },
        ]}
      />

      {tab === 'overview' && (
        <div className="card"><div className="card-body">
          <h3>Qısa Məlumat</h3>
          <p>Bu səhifə {companyName} şirkətinin bütün gömrük fəaliyyətinin audit üçün cəmlənmiş 360° görünüşünü təqdim edir.</p>
          <div className="divider" />
          <p><b>Ümumi sənədlər:</b> {companyDecls.length}</p>
          <p><b>Aktiv audit işləri:</b> {companyCases.filter((c) => c.status !== 'Closed').length}</p>
          <p><b>Aşkar anomaliyalar:</b> {companyAnomalies.filter((a) => !a.dismissed).length}</p>
          <p><b>Açıq tapıntılar:</b> {companyFindings.filter((f) => f.status === 'Açıq' || f.status === 'İşlənir').length}</p>
        </div></div>
      )}

      {tab === 'declarations' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>Qeydiyyat №</th><th>Sənəd Növü</th><th>Şöbə</th><th>Qəbul Tarixi</th><th>Cari Vəziyyət</th><th>Risk Göstəricisi</th><th className="cell-num">Bəyan Dəyəri</th><th></th></tr></thead>
            <tbody>
              {companyDecls.map((d) => (
                <tr key={d.id} onClick={() => handleOpenDecl(d.id)}>
                  <td className="cell-id">{d.id.slice(-12)}</td>
                  <td>{d.kind}</td>
                  <td>{d.department}</td>
                  <td>{formatDate(d.uploadedAt)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td><RiskBadge level={d.ai.riskLevel} score={d.ai.score} /></td>
                  <td className="cell-num">{d.totals.totalDeclaredValue.toFixed(2)} {d.totals.currency}</td>
                  <td><ExternalLink size={14} style={{ color: 'var(--n-400)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {companyDecls.length === 0 && <EmptyState title="Sənəd yoxdur" />}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card"><div className="card-body">
          <h3>Bütün sənədlər</h3>
          {companyDecls.flatMap((d) => d.documents.map((doc) => ({ ...doc, declId: d.id }))).length === 0 ? (
            <EmptyState title="Sənəd yoxdur" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {companyDecls.flatMap((d) => d.documents.map((doc) => ({ ...doc, declId: d.id }))).map((doc) => (
                <div key={doc.id} className="doc-card" onClick={() => handleOpenDecl(doc.declId)} style={{ cursor: 'pointer' }}>
                  <div className="doc-icon">📄</div>
                  <div className="doc-meta">
                    <div className="doc-name">{doc.typeCode} — {doc.fileName}</div>
                    <div className="doc-info">{doc.fileSizeKB} KB · {formatDate(doc.uploadedAt)} · Sənəd: {doc.declId.slice(-8)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>
      )}

      {tab === 'history' && (
        <div className="card"><div className="card-body">
          {companyLogs.length === 0 ? (
            <EmptyState title="Tarixçə yoxdur" />
          ) : (
            <div className="timeline">
              {groupByDay(companyLogs.slice(0, 100)).map((g) => (
                <div key={g.label} className="timeline-group">
                  <div className="tg-label">{g.label}</div>
                  {g.items.map((l) => (
                    <div key={l.id} className="timeline-item">
                      <div className="ti-title"><b>{l.actorDisplayName}</b> · {l.description}</div>
                      <div className="ti-meta">{formatDateTime(l.at)}{l.declarationId ? ` · ${l.declarationId.slice(-8)}` : ''}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div></div>
      )}

      {tab === 'inspectors' && (
        <div className="card no-pad">
          <table className="table">
            <thead><tr><th>İnspektor</th><th>Şöbə</th><th className="cell-num">İşlər</th><th className="cell-num">Ort. Risk</th></tr></thead>
            <tbody>
              {inspectorsInvolved.map((insId) => {
                const ins = users.find((u) => u.id === insId);
                if (!ins) return null;
                const insDecls = companyDecls.filter((d) => d.assignedInspectorId === insId);
                const avg = insDecls.length > 0 ? Math.round(insDecls.reduce((a, d) => a + d.ai.score, 0) / insDecls.length) : 0;
                const dispN = ins.entityType === 'individual' ? `${ins.firstName} ${ins.lastName}` : '';
                return (
                  <tr key={insId} style={{ cursor: 'default' }}>
                    <td><b>{dispN}</b></td>
                    <td>{(ins as IndividualUser).department}</td>
                    <td className="cell-num">{insDecls.length}</td>
                    <td className="cell-num">{avg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {inspectorsInvolved.length === 0 && <EmptyState title="İnspektor təyini yoxdur" />}
        </div>
      )}

      {tab === 'anomalies' && (
        <div className="card"><div className="card-body">
          {companyAnomalies.length === 0 ? (
            <EmptyState title="Anomaliya yoxdur" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {companyAnomalies.map((a) => (
                <div key={a.id} className={`ai-flag ${a.severity === 'Kritik' || a.severity === 'Yüksək' ? 'critical' : a.severity === 'Orta' ? 'warning' : 'info'}`}>
                  <strong>{ANOMALY_PATTERN_LABEL[a.patternCode] ?? a.patternLabel}</strong>
                  <div style={{ marginTop: 4 }}>{a.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 4 }}>
                    Aşkarlama: {formatDateTime(a.detectedAt)} · Şiddət: {a.severity}
                    {a.dismissed && ' · Gizlədilib'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>
      )}

      {tab === 'findings' && (
        <div className="card no-pad">
          <table className="table table-dense">
            <thead><tr><th>Başlıq</th><th>Pozuntu Növü</th><th>Şiddət</th><th>Cari Vəziyyət</th><th className="cell-num">Rüsum Təsiri</th><th>Qeydiyyat Tarixi</th></tr></thead>
            <tbody>
              {companyFindings.map((f) => (
                <tr key={f.id} style={{ cursor: 'default' }}>
                  <td><b>{f.title}</b></td>
                  <td>{FINDING_CATEGORY_LABEL[f.category] ?? f.category}</td>
                  <td>{f.severity}</td>
                  <td>{FINDING_STATUS_LABEL[f.status] ?? f.status}</td>
                  <td className="cell-num">{formatCurrency(f.dutyImpact)}</td>
                  <td>{formatDate(f.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {companyFindings.length === 0 && <EmptyState title="Audit tapıntısı yoxdur" />}
        </div>
      )}

      {tab === 'compare' && (
        <div className="card"><div className="card-body">
          <h3>Müqayisə (sektor ortalaması ilə)</h3>
          <p className="text-muted">Şirkətin parametrlərinin sistem geneli orta dəyərlərlə müqayisəsi.</p>
          {(() => {
            const allAvgScore = decls.length > 0 ? decls.reduce((a, d) => a + d.ai.score, 0) / decls.length : 0;
            const allAvgValue = decls.length > 0 ? decls.reduce((a, d) => a + d.totals.totalDeclaredValue, 0) / decls.length : 0;
            const compAvgScore = companyDecls.length > 0 ? companyDecls.reduce((a, d) => a + d.ai.score, 0) / companyDecls.length : 0;
            const compAvgValue = companyDecls.length > 0 ? companyDecls.reduce((a, d) => a + d.totals.totalDeclaredValue, 0) / companyDecls.length : 0;
            return (
              <div className="table-wrap mt-3">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Göstərici</th>
                      <th className="cell-num">Bu şirkət</th>
                      <th className="cell-num">Sistem ortalaması</th>
                      <th className="cell-num">Fərq</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ cursor: 'default' }}>
                      <td><b>Orta risk skoru</b></td>
                      <td className="cell-num">{compAvgScore.toFixed(1)}</td>
                      <td className="cell-num">{allAvgScore.toFixed(1)}</td>
                      <td className="cell-num" style={{ color: compAvgScore > allAvgScore ? '#dc2626' : '#16a34a' }}>
                        {compAvgScore > allAvgScore ? '↑' : '↓'} {Math.abs(compAvgScore - allAvgScore).toFixed(1)}
                      </td>
                    </tr>
                    <tr style={{ cursor: 'default' }}>
                      <td><b>Orta bəyan dəyəri (AZN)</b></td>
                      <td className="cell-num">{compAvgValue.toFixed(0)}</td>
                      <td className="cell-num">{allAvgValue.toFixed(0)}</td>
                      <td className="cell-num" style={{ color: compAvgValue > allAvgValue ? '#dc2626' : '#16a34a' }}>
                        {compAvgValue > allAvgValue ? '↑' : '↓'} {Math.abs(compAvgValue - allAvgValue).toFixed(0)}
                      </td>
                    </tr>
                    <tr style={{ cursor: 'default' }}>
                      <td><b>Sənəd sayı</b></td>
                      <td className="cell-num">{companyDecls.length}</td>
                      <td className="cell-num">{(decls.length / Math.max(1, new Set(decls.map((d) => d.ownerId)).size)).toFixed(1)}</td>
                      <td className="cell-num text-muted">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div></div>
      )}
    </div>
  );
}
