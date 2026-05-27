import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, MessageSquare,
  RefreshCw, UserCog, ChevronRight, Send, Eye, Info,
} from 'lucide-react';
import { StatusBadge, RiskBadge, ChannelPill, Modal, Tabs, EmptyState, Avatar, RoleChip } from '../../components/ui/Primitives';
import { TextField, TextareaField, SelectField } from '../../components/forms/Fields';
import { formatDate, formatDateTime, formatCurrency, relativeTime, groupByDay, cn } from '../../lib/utils';
import { DOCUMENT_TYPES, DOCUMENT_GROUPS, RISK_META } from '../../lib/constants';
import { toast } from '../../store/toastStore';
import { validateDeclaration } from '../../lib/validation';
import type { IndividualUser } from '../../types';

export function DeclarationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const declarations = useDataStore((s) => s.declarations);
  const users = useDataStore((s) => s.users);
  const logs = useDataStore((s) => s.logs);
  const changeStatus = useDataStore((s) => s.changeStatus);
  const resubmitDeclaration = useDataStore((s) => s.resubmitDeclaration);
  const assignInspector = useDataStore((s) => s.assignInspector);
  const addComment = useDataStore((s) => s.addComment);
  const logPCAView = useDataStore((s) => s.logPCAView);

  const decl = declarations.find((d) => d.id === id);

  const viewedRef = React.useRef(false);
  React.useEffect(() => {
    if (user.role === 'pca' && decl && !viewedRef.current) {
      viewedRef.current = true;
      logPCAView(decl.id, user);
    }
  }, [decl, user, logPCAView]);

  const [tab, setTab] = React.useState('details');
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [comment, setComment] = React.useState('');

  if (!decl) {
    return (
      <div>
        <Link to="/declarations" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Geri</Link>
        <EmptyState title="Bəyannamə tapılmadı" hint="Bu ID-li bəyannamə mövcud deyil və ya silinib." />
      </div>
    );
  }

  const isOwner = decl.ownerId === user.id;
  const isAssignedInspector = user.role === 'inspector' && decl.assignedInspectorId === user.id;
  const isDeptHead = user.role === 'departmentHead' &&
    user.entityType === 'individual' && (user as IndividualUser).department === decl.department;
  const isBoss = user.role === 'boss';
  const isPCA = user.role === 'pca';
  const canActAsInspector = isAssignedInspector;
  const canManage = isDeptHead || isBoss;

  const inspector = users.find((u) => u.id === decl.assignedInspectorId);
  const inspectorName = inspector ? (inspector.entityType === 'individual' ? `${inspector.firstName} ${inspector.lastName}` : inspector.companyName) : null;

  const deptInspectors = users.filter((u) =>
    u.role === 'inspector' && u.entityType === 'individual' &&
    (u as IndividualUser).department === decl.department
  );

  const declLogs = logs.filter((l) => l.declarationId === decl.id).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const handleStartReview = () => {
    const r = changeStatus(decl.id, 'Yoxlanılır', user);
    if (r.ok) toast.success('Status yeniləndi: Yoxlanılır'); else toast.error(r.error ?? 'Xəta');
  };

  const handleApprove = (rejectReason: string) => {
    const r = changeStatus(decl.id, 'Təsdiq', user);
    if (r.ok) { toast.success('Bəyannamə təsdiqləndi. 5 saniyə sonra avtomatik tamamlanacaq.'); setApproveOpen(false); } else toast.error(r.error ?? 'Xəta');
  };

  const handleReject = (reason: string) => {
    if (!reason.trim()) { toast.error('Səbəb daxil edin'); return; }
    const r = changeStatus(decl.id, 'Rədd', user, { rejectReason: reason });
    if (r.ok) { toast.success('Bəyannamə rədd edildi. 5 saniyə sonra avtomatik tamamlanacaq.'); setRejectOpen(false); } else toast.error(r.error ?? 'Xəta');
  };

  const handleResubmit = () => {
    resubmitDeclaration(decl.id, user);
    toast.success('Bəyannamə yenidən təqdim edildi');
  };

  const handleComment = () => {
    if (!comment.trim()) return;
    addComment(decl.id, comment.trim(), user);
    setComment('');
    toast.success('Şərh əlavə edildi');
  };

  const ringColor = RISK_META[decl.ai.riskLevel].text;
  const ringAngle = (decl.ai.score / 100) * 360;

  // L1 validation report — deterministic, computed from current declaration state.
  const validation = React.useMemo(() => validateDeclaration({
    ownerEntityType: decl.ownerEntityType,
    kind: decl.kind,
    department: decl.department,
    declarationDate: decl.declarationDate,
    customsPoint: decl.customsPoint,
    referenceNumber: decl.referenceNumber,
    documents: decl.documents,
    shipment: decl.shipment,
    totals: decl.totals,
  }), [decl]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={14} /> Geri</button>
        <span className="text-muted text-sm">/ Bəyannamə</span>
      </div>

      <div className="card mb-4" style={{ padding: 0 }}>
        <div className="card-body">
          <div className="flex items-center gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}><span className="mono">{decl.id.slice(-12)}</span></h1>
            <StatusBadge status={decl.status} />
            <RiskBadge level={decl.ai.riskLevel} score={decl.ai.score} />
            <ChannelPill channel={decl.ai.selectivityChannel} />
          </div>
          <div className="form-row cols-3">
            <div>
              <small className="text-muted">Sahib</small>
              <div>{decl.ownerDisplayName}</div>
            </div>
            <div>
              <small className="text-muted">Növ / Şöbə</small>
              <div>{decl.kind} · {decl.department}</div>
            </div>
            <div>
              <small className="text-muted">Yüklənmə tarixi</small>
              <div>{formatDateTime(decl.uploadedAt)}</div>
            </div>
            <div>
              <small className="text-muted">Gömrük postu</small>
              <div>{decl.customsPoint}</div>
            </div>
            <div>
              <small className="text-muted">Təyin olunmuş müfəttiş</small>
              <div>{inspectorName ?? '— Təyin olunmayıb —'}</div>
            </div>
            <div>
              <small className="text-muted">Dəyər</small>
              <div className="font-bold">{decl.totals.totalDeclaredValue.toFixed(2)} {decl.totals.currency}</div>
            </div>
          </div>

          {!validation.ok && (
            <div className="banner error mt-3">
              <AlertTriangle size={20} />
              <div className="b-body">
                <div className="b-title">Sistem validasiyası uğursuz ({validation.errors.length} səhv) — bu bəyannamə təsdiq edilə bilməz</div>
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  {validation.errors.slice(0, 8).map((e, i) => (
                    <li key={i}><code>{e.code}</code> — {e.message}</li>
                  ))}
                  {validation.errors.length > 8 && (
                    <li className="text-muted">… +{validation.errors.length - 8} əlavə səhv</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {decl.status === 'Düzəliş Tələb Olunur' && decl.correctionRequest && (
            <div className="banner warning mt-3">
              <AlertTriangle size={20} />
              <div className="b-body">
                <div className="b-title">Düzəliş tələbi: {decl.correctionRequest.summary}</div>
                <div>{decl.correctionRequest.details}</div>
                <small>Tələb edən: {decl.correctionRequest.inspectorDisplayName} · {relativeTime(decl.correctionRequest.requestedAt)}</small>
              </div>
            </div>
          )}
          {decl.status === 'Rədd' && decl.rejectReason && (
            <div className="banner error mt-3">
              <XCircle size={20} />
              <div className="b-body">
                <div className="b-title">Bəyannamə rədd edildi</div>
                <div>{decl.rejectReason}</div>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
            {isOwner && decl.status === 'Düzəliş Tələb Olunur' && (
              <button className="btn btn-success" onClick={handleResubmit}>
                <RefreshCw size={14} /> Düzəlişlərdən sonra yenidən təqdim et
              </button>
            )}
            {canActAsInspector && decl.status === 'Yüklənib' && (
              <button className="btn" onClick={handleStartReview}>Yoxlamağa başla</button>
            )}
            {canActAsInspector && decl.status === 'Yoxlanılır' && (
              <>
                <button className="btn btn-success" onClick={() => setApproveOpen(true)}>
                  <CheckCircle size={14} /> Təsdiq et
                </button>
                <button className="btn btn-warning" onClick={() => setCorrectionOpen(true)}>
                  <AlertTriangle size={14} /> Düzəliş tələb et
                </button>
                <button className="btn btn-danger" onClick={() => setRejectOpen(true)}>
                  <XCircle size={14} /> Rədd et
                </button>
              </>
            )}
            {canManage && (
              <button className="btn btn-secondary" onClick={() => setReassignOpen(true)}>
                <UserCog size={14} /> Müfəttişi dəyiş
              </button>
            )}
            {isPCA && (
              <div className="readonly-pill">PCA oxuma rejimində baxılır</div>
            )}
          </div>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'details', label: 'Detallar' },
          { value: 'documents', label: 'Sənədlər', count: decl.documents.length },
          { value: 'ai', label: 'AI Analizi' },
          { value: 'comments', label: 'Şərhlər', count: decl.comments.length },
          { value: 'history', label: 'Tarixçə', count: declLogs.length },
        ]}
      />

      {tab === 'details' && (
        <div className="card">
          <div className="card-body">
            <h3>Daşıma məlumatları</h3>
            <div className="form-row cols-3 mb-3">
              <div><small className="text-muted">Mənşə</small><div>{decl.shipment.originCountry}</div></div>
              <div><small className="text-muted">Təyinat</small><div>{decl.shipment.destinationCountry}</div></div>
              <div><small className="text-muted">Nəqliyyat növü</small><div>{decl.shipment.transportMode}</div></div>
              <div><small className="text-muted">Daşıma sənədi №</small><div className="mono">{decl.shipment.transportDocumentNumber}</div></div>
              <div><small className="text-muted">Brutto / Netto</small><div>{decl.shipment.grossWeightKg} / {decl.shipment.netWeightKg} kq</div></div>
              <div><small className="text-muted">Bağlama sayı</small><div>{decl.shipment.packageCount}</div></div>
            </div>
            <div className="divider" />
            <h3>Tərəflər</h3>
            <div className="form-row cols-2">
              <div>
                <small className="text-muted">Göndərən</small>
                <div>{decl.shipment.consignor}</div>
                <small className="text-muted">{decl.shipment.consignorAddress}</small>
              </div>
              <div>
                <small className="text-muted">Alıcı</small>
                <div>{decl.shipment.consignee}</div>
                <small className="text-muted">{decl.shipment.consigneeAddress}</small>
              </div>
            </div>
            <div className="divider" />
            <h3>Dəyərlər</h3>
            <div className="form-row cols-3">
              <div><small className="text-muted">Ümumi dəyər</small><div className="font-bold text-lg">{decl.totals.totalDeclaredValue.toFixed(2)} {decl.totals.currency}</div></div>
              <div><small className="text-muted">Ümumi miqdar</small><div>{decl.totals.totalQuantity} {decl.totals.unitOfMeasure}</div></div>
              <div><small className="text-muted">HS Kodu</small><div className="mono">{decl.totals.hsCode || '—'}</div></div>
            </div>
            {decl.totals.additionalNotes && (
              <>
                <div className="divider" />
                <h4>Əlavə qeydlər</h4>
                <p>{decl.totals.additionalNotes}</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          <div className="card-body">
            {(() => {
              // Per-document RBAC: filter by visibleTo (default all roles)
              const visibleDocs = decl.documents.filter((d) => !d.visibleTo || d.visibleTo.includes(user.role));
              const hiddenCount = decl.documents.length - visibleDocs.length;
              return (
                <>
                  {hiddenCount > 0 && (
                    <div className="banner info">
                      <Eye size={16} />
                      <div className="b-body">
                        <div className="b-title">Sizin görmə icazəniz olmayan sənədlər var</div>
                        <div>{hiddenCount} sənəd rolunuza ({user.role}) görə gizlədilib.</div>
                      </div>
                    </div>
                  )}
                  {visibleDocs.length === 0 ? <EmptyState title="Sizə görünən sənəd yoxdur" /> : (
                <>
                {(['FINANCIAL', 'LEGAL', 'CUSTOMS', 'TRANSPORT', 'CERTIFICATES'] as const).map((g) => {
                  const items = visibleDocs.filter((d) => d.group === g);
                  if (items.length === 0) return null;
                  return (
                    <div key={g} style={{ marginBottom: 14 }}>
                      <h4 className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        {DOCUMENT_GROUPS[g]} ({items.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                        {items.map((d) => (
                          <div key={d.id} className="doc-card">
                            <div className="doc-icon"><MessageSquare size={18} /></div>
                            <div className="doc-meta">
                              <div className="doc-name">{DOCUMENT_TYPES.find((t) => t.code === d.typeCode)?.label}</div>
                              <div className="doc-info">{d.fileName} · {d.fileSizeKB} KB · {formatDateTime(d.uploadedAt)}</div>
                              <details style={{ marginTop: 6 }}>
                                <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--brand-700)' }}>Sahələri göstər</summary>
                                <div style={{ marginTop: 6, padding: 8, background: 'var(--n-50)', borderRadius: 6, fontSize: 12 }}>
                                  {Object.entries(d.fields).map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                                      <span className="text-muted">{k}:</span>
                                      <span>{Array.isArray(v) ? `${v.length} sətir` : String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="card">
          <div className="card-body">
            <div className="ai-panel">
              <div style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
                <div
                  className="ai-score-circle"
                  style={{ position: 'relative', '--ring-color': ringColor, '--ring-angle': `${ringAngle}deg` } as any}
                >
                  <div className="inner">
                    <div className="v">{decl.ai.score}</div>
                    <div className="l">{RISK_META[decl.ai.riskLevel].label}</div>
                  </div>
                </div>
                <div className="mt-3"><ChannelPill channel={decl.ai.selectivityChannel} /></div>
              </div>
              <div>
                <h3>AI əlamətləri ({decl.ai.flags.length})</h3>
                {decl.ai.reasoning && (
                  <div className="banner info" style={{ marginBottom: 12 }}>
                    <Info size={16} />
                    <div className="b-body"><div className="b-title">Qərarın izahı</div><div>{decl.ai.reasoning}</div></div>
                  </div>
                )}
                {decl.ai.flags.length === 0 && <p className="text-muted">Heç bir əlamət aşkar edilməyib — risk minimaldır.</p>}
                <div className="ai-flags">
                  {decl.ai.flags.map((f, i) => (
                    <div key={i} className={`ai-flag ${f.severity}`}>
                      <div style={{ fontWeight: 600 }}>{f.message}</div>
                      <small>Kod: <span className="mono">{f.code}</span> · Çəki: +{f.points}{f.ruleId ? ` · Qayda: ${f.ruleId}` : ''}</small>
                      {f.evidence && <div style={{ marginTop: 4, fontSize: 12 }}><b>Sübut:</b> {f.evidence}</div>}
                      {f.references && f.references.length > 0 && (
                        <div style={{ marginTop: 2, fontSize: 12 }}><b>Mənbə:</b> {f.references.join(', ')}</div>
                      )}
                    </div>
                  ))}
                </div>

                {decl.ai.thresholds && decl.ai.thresholds.length > 0 && (
                  <>
                    <div className="divider" />
                    <h4>Skor → Səviyyə → Kanal hədləri</h4>
                    <div className="table-wrap" style={{ marginTop: 6 }}>
                      <table className="table table-dense">
                        <thead><tr><th>Səviyyə</th><th>Skor aralığı</th><th>Kanal</th><th>Etiket</th></tr></thead>
                        <tbody>
                          {decl.ai.thresholds.map((t) => (
                            <tr key={t.band} style={{
                              cursor: 'default',
                              background: t.band === decl.ai.riskLevel ? 'var(--brand-50)' : undefined,
                              fontWeight: t.band === decl.ai.riskLevel ? 600 : 400,
                            }}>
                              <td>{t.band}</td>
                              <td>{t.min}–{t.max}</td>
                              <td><ChannelPill channel={t.channel} /></td>
                              <td>{t.label}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {decl.ai.referenceData && (decl.ai.referenceData.hsCode || decl.ai.referenceData.originCountry || decl.ai.referenceData.commodity) && (
                  <>
                    <div className="divider" />
                    <h4>İstifadə olunan referans məlumatlar</h4>
                    {decl.ai.referenceData.hsCode && (
                      <div className="text-sm" style={{ padding: '4px 0' }}>
                        <b>HS Kodu:</b> <span className="mono">{decl.ai.referenceData.hsCode.code}</span> — {decl.ai.referenceData.hsCode.label}; tariff {decl.ai.referenceData.hsCode.tariffRate}%; risk: <b>{decl.ai.referenceData.hsCode.riskTier}</b>
                      </div>
                    )}
                    {decl.ai.referenceData.originCountry && (
                      <div className="text-sm" style={{ padding: '4px 0' }}>
                        <b>Mənşə:</b> {decl.ai.referenceData.originCountry.name} ({decl.ai.referenceData.originCountry.code}); risk: <b>{decl.ai.referenceData.originCountry.tier}</b>; səbəb: {decl.ai.referenceData.originCountry.reason}
                      </div>
                    )}
                    {decl.ai.referenceData.commodity && (
                      <div className="text-sm" style={{ padding: '4px 0' }}>
                        <b>Mal kateqoriyası:</b> {decl.ai.referenceData.commodity.label} ({decl.ai.referenceData.commodity.hsPrefix})
                        {decl.ai.referenceData.commodity.controls.length > 0 && <> · Nəzarət: {decl.ai.referenceData.commodity.controls.join(', ')}</>}
                      </div>
                    )}
                  </>
                )}

                {decl.ai.rulesEvaluated && decl.ai.rulesEvaluated.length > 0 && (
                  <>
                    <div className="divider" />
                    <details>
                      <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 6 }}>
                        Bütün qaydaların qiymətləndirilməsi ({decl.ai.rulesEvaluated.filter((r) => r.triggered).length} aktiv / {decl.ai.rulesEvaluated.length} ümumi)
                      </summary>
                      <div className="table-wrap" style={{ marginTop: 6 }}>
                        <table className="table table-dense">
                          <thead><tr><th>Qayda</th><th>Çəki</th><th>Tətbiq olundu?</th></tr></thead>
                          <tbody>
                            {decl.ai.rulesEvaluated.map((r) => (
                              <tr key={r.id} style={{ cursor: 'default', opacity: r.triggered ? 1 : 0.6 }}>
                                <td>{r.name} <span className="mono text-muted" style={{ fontSize: 11 }}>({r.id})</span></td>
                                <td className="cell-num">+{r.weight}</td>
                                <td>{r.triggered ? '✓' : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </>
                )}

                {decl.aiHistory.length > 1 && (
                  <>
                    <div className="divider" />
                    <h4>Qiymətləndirmə tarixçəsi</h4>
                    <div className="text-sm">
                      {decl.aiHistory.map((a, i) => (
                        <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--n-100)' }}>
                          <span className="text-muted">{formatDateTime(a.runAt)}</span> — Skor: <b>{a.score}</b> ({RISK_META[a.riskLevel].label}), {a.flags.length} əlamət
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'comments' && (
        <div className="card">
          <div className="card-body">
            {decl.comments.length === 0 && (
              <p className="text-muted">Hələ şərh yoxdur</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {decl.comments.map((c) => (
                <div key={c.id} className="activity-item">
                  <Avatar name={c.authorDisplayName} />
                  <div className="a-body">
                    <div className="a-text">
                      <b>{c.authorDisplayName}</b> <RoleChip role={c.authorRole} />
                      <div style={{ marginTop: 4 }}>{c.text}</div>
                    </div>
                    <div className="a-time">{relativeTime(c.at)}</div>
                  </div>
                </div>
              ))}
            </div>
            {!isPCA && (
              <>
                <div className="divider" />
                <h4>Şərh yaz</h4>
                <textarea className="textarea" rows={3} placeholder="Şərhinizi yazın..." value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="text-right mt-2">
                  <button className="btn" onClick={handleComment} disabled={!comment.trim()}>
                    <Send size={14} /> Göndər
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="card-body">
            {declLogs.length === 0 ? (
              <p className="text-muted">Hələ giriş yoxdur</p>
            ) : (
              <div className="timeline">
                {groupByDay(declLogs).map((g) => (
                  <div key={g.label} className="timeline-group">
                    <div className="tg-label">{g.label}</div>
                    {g.items.map((l) => (
                      <div key={l.id} className="timeline-item">
                        <div className="ti-title">
                          <b>{l.actorDisplayName}</b> · {l.description}
                        </div>
                        <div className="ti-meta">
                          {formatDateTime(l.at)} · <RoleChip role={l.actorRole} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ApproveModal open={approveOpen} onClose={() => setApproveOpen(false)} onConfirm={handleApprove} />
      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={handleReject} />
      <CorrectionModal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        onConfirm={(summary, details) => {
          const r = changeStatus(decl.id, 'Düzəliş Tələb Olunur', user, { correctionSummary: summary, correctionDetails: details });
          if (r.ok) { toast.success('Düzəliş tələbi göndərildi'); setCorrectionOpen(false); } else toast.error(r.error ?? 'Xəta');
        }}
      />
      <ReassignModal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        currentId={decl.assignedInspectorId}
        inspectors={deptInspectors.map((i) => ({ id: i.id, label: i.entityType === 'individual' ? `${i.firstName} ${i.lastName} — ${(i as IndividualUser).fin}` : i.companyName }))}
        onConfirm={(newId) => {
          assignInspector(decl.id, newId, user);
          toast.success('Müfəttiş yeniləndi');
          setReassignOpen(false);
        }}
      />
    </div>
  );
}

function ApproveModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (s: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Bəyannaməni təsdiqlə"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Ləğv et</button><button className="btn btn-success" onClick={() => onConfirm('')}>Təsdiq et</button></>}>
      <p>Bu bəyannaməni təsdiqləmək istədiyinizə əminsiniz?</p>
      <p className="text-muted text-sm">Təsdiqdən 5 saniyə sonra sistem avtomatik olaraq bəyannaməni "Tamamlanmış" statusuna keçirəcək.</p>
    </Modal>
  );
}

function RejectModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = React.useState('');
  React.useEffect(() => { if (!open) setReason(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Bəyannaməni rədd et"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Ləğv et</button><button className="btn btn-danger" onClick={() => onConfirm(reason)}>Rədd et</button></>}>
      <div className="form-group">
        <label className="label">Rədd səbəbi <span className="req">*</span></label>
        <textarea className="textarea" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rədd səbəbini ətraflı qeyd edin..." />
      </div>
    </Modal>
  );
}

function CorrectionModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (summary: string, details: string) => void }) {
  const [summary, setSummary] = React.useState('');
  const [details, setDetails] = React.useState('');
  React.useEffect(() => { if (!open) { setSummary(''); setDetails(''); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Düzəliş tələb et"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Ləğv et</button><button className="btn btn-warning" onClick={() => { if (!summary.trim()) { toast.error('Qısa səbəb daxil edin'); return; } onConfirm(summary, details); }}>Göndər</button></>}>
      <div className="form-group">
        <label className="label">Qısa səbəb <span className="req">*</span></label>
        <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="məs: HS Kodu yanlışdır" />
      </div>
      <div className="form-group">
        <label className="label">Detallı izah</label>
        <textarea className="textarea" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Hansı sahələrdə dəyişiklik tələb olunur..." />
      </div>
    </Modal>
  );
}

function ReassignModal({ open, onClose, onConfirm, inspectors, currentId }: { open: boolean; onClose: () => void; onConfirm: (id: string) => void; inspectors: { id: string; label: string }[]; currentId: string | null }) {
  const [pick, setPick] = React.useState('');
  React.useEffect(() => { if (open) setPick(currentId ?? ''); }, [open, currentId]);
  return (
    <Modal open={open} onClose={onClose} title="Müfəttişi dəyiş"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Ləğv et</button><button className="btn" onClick={() => { if (!pick) { toast.error('Müfəttiş seçin'); return; } onConfirm(pick); }}>Dəyiş</button></>}>
      <div className="form-group">
        <label className="label">Yeni müfəttiş</label>
        <select className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Seçin...</option>
          {inspectors.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
      </div>
    </Modal>
  );
}
