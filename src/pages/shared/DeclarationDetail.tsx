import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCurrentUser } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, MessageSquare,
  RefreshCw, UserCog, ChevronRight, Send, Eye, Info, FileText, Download,
  Image as ImageIcon, FileSpreadsheet, File as FileIcon, Edit2,
} from 'lucide-react';
import { useForm as useFormRHF, FormProvider as FormProviderRHF } from 'react-hook-form';
import { StatusBadge, RiskBadge, ChannelPill, Modal, Tabs, EmptyState, Avatar, RoleChip } from '../../components/ui/Primitives';
import { TextField, TextareaField, SelectField, FileUploaderField } from '../../components/forms/Fields';
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
  // Revision workflow: track which doc the owner is currently editing AND
  // whether they've explicitly acknowledged that they finished editing. We
  // never auto-resubmit just because the inspector clicked "request revision".
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = React.useState(false);
  const replaceDeclarationDocument = useDataStore((s) => s.replaceDeclarationDocument);

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
                {isOwner && (
                  <div style={{ marginTop: 8 }}>
                    <b>Növbəti addım:</b> Aşağıdakı "Sənədlər" sekmesinə keçin, müvafiq sənədi yeniləyin və yalnız hər şey hazır olduqda <i>"Yenidən təqdim et"</i> düyməsini sıxın. Bu səhifəyə qayıtmaq düzəlişi avtomatik təqdim etmir.
                  </div>
                )}
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
              <>
                <button className="btn btn-secondary" onClick={() => setTab('documents')}>
                  <FileText size={14} /> Sənədləri düzəlt
                </button>
                <button className="btn btn-success" onClick={() => setResubmitConfirmOpen(true)}>
                  <RefreshCw size={14} /> Yenidən təqdim et
                </button>
              </>
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
          ...(isPCA ? [{ value: 'pca', label: 'PCA Audit Paneli' }] : []),
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
        <DocumentsTab
          decl={decl}
          viewerRole={user.role}
          canEdit={isOwner && decl.status === 'Düzəliş Tələb Olunur'}
          onEdit={(docId) => setEditingDocId(docId)}
        />
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

      {tab === 'pca' && isPCA && (
        <PCAAuditPanel decl={decl} inspectorName={inspectorName} auditor={user} />
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

      <Modal
        open={resubmitConfirmOpen}
        onClose={() => setResubmitConfirmOpen(false)}
        title="Yenidən təqdim etməyi təsdiqləyin"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setResubmitConfirmOpen(false)}>Ləğv et</button>
          <button className="btn btn-success" onClick={() => { setResubmitConfirmOpen(false); handleResubmit(); }}>
            Bəli, yenidən təqdim et
          </button>
        </>}>
        <p><b>Düzəliş tələbi:</b> {decl.correctionRequest?.summary}</p>
        <p>Tələb olunan dəyişiklikləri həqiqətən etdinizmi? Yenidən təqdim etdikdən sonra müfəttişə bildiriş gedəcək və AI bəyannaməni yenidən qiymətləndirəcək.</p>
        <p className="text-muted text-sm">Əgər hələ sənədləri yeniləməmisinizsə, <b>Ləğv et</b> düyməsini sıxın və əvvəl "Sənədlər" sekmesindən düzəliş edin.</p>
      </Modal>

      {editingDocId && (() => {
        const target = decl.documents.find((d) => d.id === editingDocId);
        if (!target) return null;
        return (
          <ReplaceDocumentModal
            doc={target}
            onClose={() => setEditingDocId(null)}
            onSave={(nextDoc) => {
              const r = replaceDeclarationDocument(decl.id, editingDocId, nextDoc, user);
              if (!r.ok) { toast.error(r.error ?? 'Sənəd dəyişdirilə bilmədi'); return; }
              toast.success('Sənəd yeniləndi');
              setEditingDocId(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Replace-document modal — only available to the owner under correction status.
// Lets them upload a new file and edit the structured fields, then patches the
// declaration. Resubmission stays a separate explicit step.
// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// PCA Audit Panel — surfaces, in one place, EVERYTHING a PCA auditor needs:
//   • What the problem is — inspector decision, reject reason, correction req.
//   • Why accepted / failed — AI reasoning, status timeline (decision logs).
//   • Inspector findings — comments authored by the inspector, decision log.
//   • Risk reasons — flags with evidence + rule references.
//   • Evidence & references — every flag's evidence + reference list.
// Plus actions:
//   • Watchlist toggle
//   • "Open finding from this declaration" (auto-fills caseId if a PCA case
//     exists for this declaration)
//   • Update PCA case status (Pending → In Review → ... → Closed)
//   • Add audit note (logged as comment, visible to all stakeholders)
// ────────────────────────────────────────────────────────────────────────────
function PCAAuditPanel({ decl, inspectorName, auditor }: { decl: any; inspectorName: string | null; auditor: any }) {
  const navigate = useNavigate();
  const cases = useDataStore((s) => s.pcaCases);
  const findings = useDataStore((s) => s.pcaFindings);
  const logs = useDataStore((s) => s.logs);
  const watchlists = useDataStore((s) => s.watchlists);
  const toggleWatchlist = useDataStore((s) => s.toggleWatchlist);
  const setPCACaseStatus = useDataStore((s) => s.setPCACaseStatus);
  const addFinding = useDataStore((s) => s.addPCAFinding);
  const addComment = useDataStore((s) => s.addComment);

  const ourCase = cases.find((c) => c.declarationId === decl.id);
  const ourFindings = findings.filter((f) => f.declarationId === decl.id);
  const inspectorLogs = logs.filter((l) =>
    l.declarationId === decl.id && (l.actorRole === 'inspector' || l.action === 'DECISION' || l.action === 'CORRECTION_REQUESTED')
  );
  const watch = watchlists.find((w) => w.auditorId === auditor.id);
  const isWatched = watch?.companyIds.includes(decl.ownerId) ?? false;

  const [findingOpen, setFindingOpen] = React.useState(false);
  const [auditNote, setAuditNote] = React.useState('');

  const decisionSummary = (() => {
    if (decl.status === 'Tamamlanmış') {
      if (decl.rejectReason) return { verdict: 'Rədd edildikdən sonra tamamlandı', tone: 'error' as const, detail: decl.rejectReason };
      return { verdict: 'Təsdiq olundu və tamamlandı', tone: 'success' as const, detail: 'Müfəttiş təsdiqindən sonra avtomatik tamamlandı.' };
    }
    if (decl.status === 'Təsdiq') return { verdict: 'Təsdiq olundu', tone: 'success' as const, detail: 'Müfəttiş bəyannaməni təsdiqlədi.' };
    if (decl.status === 'Rədd') return { verdict: 'Rədd edildi', tone: 'error' as const, detail: decl.rejectReason ?? 'Səbəb göstərilməyib' };
    return { verdict: decl.status, tone: 'info' as const, detail: 'Bəyannamə hələ qiymətləndirmə altındadır.' };
  })();

  const criticalFlags = decl.ai.flags.filter((f: any) => f.severity === 'critical');
  const warningFlags = decl.ai.flags.filter((f: any) => f.severity === 'warning');

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>PCA Audit Paneli</h3>
          <span className="readonly-pill"><Eye size={14} /> Auditor görünüşü</span>
        </div>

        {/* PROBLEM */}
        <h4>1. Problem nədir?</h4>
        <div className={`banner ${decisionSummary.tone === 'success' ? 'info' : decisionSummary.tone === 'error' ? 'error' : 'info'}`}>
          <Info size={16} />
          <div className="b-body">
            <div className="b-title">{decisionSummary.verdict}</div>
            <div>{decisionSummary.detail}</div>
          </div>
        </div>
        {criticalFlags.length > 0 && (
          <div className="banner error" style={{ marginTop: 8 }}>
            <AlertTriangle size={16} />
            <div className="b-body">
              <div className="b-title">{criticalFlags.length} kritik risk siqnalı aşkar edilib</div>
              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                {criticalFlags.map((f: any, i: number) => (
                  <li key={i}><b>{f.code}</b> — {f.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="divider" />

        {/* WHY ACCEPTED / FAILED */}
        <h4>2. Niyə qəbul / rədd edildi?</h4>
        <p className="text-muted">{decl.ai.reasoning || 'Sistem izahatı boşdur.'}</p>
        <div className="form-row cols-2 mb-2">
          <div>
            <small className="text-muted">Müfəttiş</small>
            <div>{inspectorName ?? '— Təyin olunmayıb —'}</div>
          </div>
          <div>
            <small className="text-muted">AI risk skoru</small>
            <div className="font-bold">{decl.ai.score} / 100 · {decl.ai.riskLevel} · {decl.ai.selectivityChannel}</div>
          </div>
        </div>

        <div className="divider" />

        {/* INSPECTOR FINDINGS */}
        <h4>3. Müfəttiş tapıntıları və qərarları</h4>
        {inspectorLogs.length === 0 ? (
          <p className="text-muted">Müfəttiş tərəfindən qeydə alınmış əməliyyat yoxdur.</p>
        ) : (
          <div className="timeline" style={{ marginTop: 6 }}>
            {inspectorLogs.slice(0, 10).map((l) => (
              <div key={l.id} className="timeline-item">
                <div className="ti-title"><b>{l.actorDisplayName}</b> · {l.description}</div>
                <div className="ti-meta">{formatDateTime(l.at)} · <RoleChip role={l.actorRole} /></div>
              </div>
            ))}
          </div>
        )}
        {decl.correctionRequest && (
          <div className="banner warning" style={{ marginTop: 8 }}>
            <AlertTriangle size={16} />
            <div className="b-body">
              <div className="b-title">Düzəliş tələbi: {decl.correctionRequest.summary}</div>
              <div>{decl.correctionRequest.details}</div>
            </div>
          </div>
        )}

        <div className="divider" />

        {/* RISK REASONS */}
        <h4>4. Risk səbəbləri ({decl.ai.flags.length})</h4>
        {decl.ai.flags.length === 0 ? (
          <p className="text-muted">Aktiv risk əlaməti yoxdur.</p>
        ) : (
          <div className="ai-flags">
            {[...criticalFlags, ...warningFlags, ...decl.ai.flags.filter((f: any) => f.severity === 'info')].map((f: any, i: number) => (
              <div key={i} className={`ai-flag ${f.severity}`}>
                <div style={{ fontWeight: 600 }}>{f.message} <span className="text-muted">(+{f.points})</span></div>
                <small>Kod: <span className="mono">{f.code}</span>{f.ruleId ? ` · Qayda: ${f.ruleId}` : ''}</small>
                {f.evidence && <div style={{ marginTop: 4, fontSize: 12 }}><b>Sübut:</b> {f.evidence}</div>}
                {f.references && f.references.length > 0 && (
                  <div style={{ marginTop: 2, fontSize: 12 }}><b>Mənbə:</b> {f.references.join(', ')}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="divider" />

        {/* EVIDENCE & REFERENCES */}
        <h4>5. İstifadə olunmuş istinad məlumatları</h4>
        {decl.ai.referenceData && (decl.ai.referenceData.hsCode || decl.ai.referenceData.originCountry || decl.ai.referenceData.commodity) ? (
          <div className="text-sm">
            {decl.ai.referenceData.hsCode && (
              <div style={{ padding: '4px 0' }}>
                <b>HS Kodu:</b> <span className="mono">{decl.ai.referenceData.hsCode.code}</span> — {decl.ai.referenceData.hsCode.label}; tariff {decl.ai.referenceData.hsCode.tariffRate}%; risk: <b>{decl.ai.referenceData.hsCode.riskTier}</b>
              </div>
            )}
            {decl.ai.referenceData.originCountry && (
              <div style={{ padding: '4px 0' }}>
                <b>Mənşə:</b> {decl.ai.referenceData.originCountry.name} ({decl.ai.referenceData.originCountry.code}); risk: <b>{decl.ai.referenceData.originCountry.tier}</b>; səbəb: {decl.ai.referenceData.originCountry.reason}
              </div>
            )}
            {decl.ai.referenceData.commodity && (
              <div style={{ padding: '4px 0' }}>
                <b>Mal kateqoriyası:</b> {decl.ai.referenceData.commodity.label} ({decl.ai.referenceData.commodity.hsPrefix})
                {decl.ai.referenceData.commodity.controls.length > 0 && <> · Nəzarət: {decl.ai.referenceData.commodity.controls.join(', ')}</>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted">Bu bəyannamə üçün məlumat bazasından istinad istifadə edilməyib.</p>
        )}

        <div className="divider" />

        {/* ACTIONS — PCA can take decisions WITHOUT modifying core data */}
        <h4>6. PCA əməliyyatları</h4>
        <p className="text-muted text-sm">PCA bəyannamənin özünü dəyişmir — yalnız audit qərarı, tapıntı və izləmə qeydiyyatı əlavə edir.</p>
        <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          <button className={`btn ${isWatched ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => { toggleWatchlist(auditor.id, decl.ownerId); toast.success(isWatched ? 'İzləmə siyahısından çıxarıldı' : 'İzləmə siyahısına əlavə edildi'); }}>
            {isWatched ? 'İzlənilir' : 'Şirkəti izlə'}
          </button>
          <button className="btn" onClick={() => setFindingOpen(true)} disabled={!ourCase}>
            Tapıntı aç
          </button>
          {ourCase && (
            <>
              <button className="btn btn-secondary" onClick={() => { setPCACaseStatus(ourCase.id, 'In Review', auditor.id, `Audit başladı: ${decl.id}`); toast.success('PCA işi statusu: In Review'); }}>
                Auditə götür
              </button>
              <button className="btn btn-danger" onClick={() => { setPCACaseStatus(ourCase.id, 'Penalty Applied', auditor.id, `Cərimə tətbiq olundu — bəyan: ${decl.id}`); toast.success('Cərimə qeyd olundu'); }}>
                Cərimə tətbiq et
              </button>
              <button className="btn btn-secondary" onClick={() => { setPCACaseStatus(ourCase.id, 'Escalated', auditor.id, `Eskalasiya — bəyan: ${decl.id}`); toast.info('Eskalasiya qeyd olundu'); }}>
                Eskalə et
              </button>
              <button className="btn btn-success" onClick={() => { setPCACaseStatus(ourCase.id, 'Closed', auditor.id, `Audit bağlandı — bəyan: ${decl.id}`); toast.success('İş bağlandı'); }}>
                İşi bağla
              </button>
            </>
          )}
          <button className="btn btn-ghost" onClick={() => navigate(`/pca/company/${decl.ownerId}`)}>
            Şirkət 360° görünüşü →
          </button>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="label">Audit qeydi (bütün rollar görəcək):</label>
          <textarea className="textarea" rows={2} value={auditNote} onChange={(e) => setAuditNote(e.target.value)}
            placeholder="məs: HS kodu yenidən baxılmalıdır; brokerlə əlaqə saxlanılsın..." />
          <div className="text-right">
            <button className="btn btn-sm" disabled={!auditNote.trim()}
              onClick={() => { addComment(decl.id, `[PCA Audit] ${auditNote.trim()}`, auditor); setAuditNote(''); toast.success('Audit qeydi əlavə edildi'); }}>
              Qeydi əlavə et
            </button>
          </div>
        </div>

        {ourFindings.length > 0 && (
          <>
            <div className="divider" />
            <h4>Bu bəyannamədən açılmış tapıntılar ({ourFindings.length})</h4>
            <table className="table table-dense">
              <thead><tr><th>Başlıq</th><th>Kateqoriya</th><th>Şiddət</th><th>Status</th><th className="cell-num">Rüsum təsiri</th></tr></thead>
              <tbody>
                {ourFindings.map((f) => (
                  <tr key={f.id} style={{ cursor: 'default' }}>
                    <td><b>{f.title}</b></td>
                    <td>{f.category}</td>
                    <td>{f.severity}</td>
                    <td>{f.status}</td>
                    <td className="cell-num">{f.dutyImpact.toFixed(0)} ₼</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {findingOpen && ourCase && (
        <QuickFindingModal
          caseRow={ourCase}
          onClose={() => setFindingOpen(false)}
          onSave={(payload) => {
            addFinding({
              ...payload,
              caseId: ourCase.id,
              declarationId: decl.id,
              companyId: decl.ownerId,
              companyName: decl.ownerDisplayName,
              createdBy: auditor.id,
              createdByName: auditor.entityType === 'individual' ? `${auditor.firstName} ${auditor.lastName}` : '',
            });
            toast.success('Tapıntı yaradıldı');
            setFindingOpen(false);
          }}
        />
      )}
    </div>
  );
}

function QuickFindingModal({ caseRow, onClose, onSave }: { caseRow: any; onClose: () => void; onSave: (p: any) => void }) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<'Aşağı qiymət' | 'HS kodu səhvi' | 'Çəki uyğunsuzluğu' | 'Sənəd çatışmır' | 'Digər'>('Aşağı qiymət');
  const [severity, setSeverity] = React.useState<'Aşağı' | 'Orta' | 'Yüksək' | 'Kritik'>('Orta');
  const [dutyImpact, setDutyImpact] = React.useState(0);
  return (
    <Modal open={true} onClose={onClose} size="lg" title={`Yeni tapıntı — ${caseRow.id}`}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Ləğv et</button>
        <button className="btn" onClick={() => {
          if (!title.trim()) { toast.error('Başlıq tələb olunur'); return; }
          onSave({ title: title.trim(), description: description.trim(), category, severity, status: 'Açıq', dutyImpact });
        }}>Yarat</button>
      </>}>
      <div className="form-group">
        <label className="label">Başlıq <span className="req">*</span></label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="məs: HS 8517.12 — IMEI yoxlanmayıb" />
      </div>
      <div className="form-group">
        <label className="label">Təsvir</label>
        <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-row cols-3">
        <div className="form-group">
          <label className="label">Kateqoriya</label>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value as any)}>
            <option value="Aşağı qiymət">Aşağı qiymət</option>
            <option value="HS kodu səhvi">HS kodu səhvi</option>
            <option value="Çəki uyğunsuzluğu">Çəki uyğunsuzluğu</option>
            <option value="Sənəd çatışmır">Sənəd çatışmır</option>
            <option value="Digər">Digər</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Şiddət</label>
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
            <option value="Aşağı">Aşağı</option>
            <option value="Orta">Orta</option>
            <option value="Yüksək">Yüksək</option>
            <option value="Kritik">Kritik</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Rüsum təsiri (₼)</label>
          <input className="input" type="number" step="0.01" value={dutyImpact} onChange={(e) => setDutyImpact(Number(e.target.value))} />
        </div>
      </div>
    </Modal>
  );
}

function ReplaceDocumentModal({ doc, onClose, onSave }: { doc: any; onClose: () => void; onSave: (d: any) => void }) {
  const meta = DOCUMENT_TYPES.find((t) => t.code === doc.typeCode);
  const methods = useFormRHF({
    defaultValues: {
      _file: { fileName: doc.fileName, fileSizeKB: doc.fileSizeKB, fileMime: doc.fileMime, uploadedAt: doc.uploadedAt },
      ...doc.fields,
    },
  });
  const submit = methods.handleSubmit((values) => {
    const { _file, ...fields } = values;
    if (!_file) { toast.error('Fayl tələb olunur'); return; }
    onSave({
      ...doc,
      fileName: _file.fileName, fileSizeKB: _file.fileSizeKB,
      fileMime: _file.fileMime, uploadedAt: _file.uploadedAt,
      fields,
      isComplete: true,
    });
  });
  return (
    <Modal open={true} onClose={onClose} size="lg" title={`Sənədi düzəlt — ${meta?.label ?? doc.typeCode}`}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Ləğv et</button>
        <button className="btn" onClick={submit}>Yadda saxla</button>
      </>}>
      <FormProviderRHF {...methods}>
        <form onSubmit={submit}>
          <FileUploaderField name="_file" label="Fayl" hint="Mövcud faylı əvəz etmək üçün yeni fayl seçin" />
          {Object.keys(doc.fields ?? {}).map((k) => (
            <div className="form-group" key={k}>
              <label className="label">{k}</label>
              <input className="input" {...methods.register(k)} />
            </div>
          ))}
        </form>
      </FormProviderRHF>
    </Modal>
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

// ============================================================================
// Documents tab — full re-design.
// • icon by MIME family
// • download (synthetic file payload — demo storage layer)
// • inline preview for images + PDF (data URI), placeholder otherwise
// • completeness badge (isComplete) and visible-to roles
// • field summary unchanged
// ============================================================================
function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon size={18} />;
  if (mime.includes('spreadsheet') || mime.includes('excel')) return <FileSpreadsheet size={18} />;
  if (mime === 'application/pdf') return <FileText size={18} />;
  if (mime.includes('word')) return <FileText size={18} />;
  return <FileIcon size={18} />;
}

function buildDownloadPayload(doc: { fileName: string; fileMime: string; fields: Record<string, any> }): Blob {
  // Demo storage has no real file blob — we serialize the structured fields
  // (which are the meaningful customs data) into a text file. Image / PDF
  // previews therefore fall back to "no preview" with a friendly message.
  const lines: string[] = [];
  lines.push(`# ${doc.fileName}`);
  lines.push(`# mime: ${doc.fileMime}`);
  lines.push('');
  for (const [k, v] of Object.entries(doc.fields ?? {})) {
    lines.push(`${k}: ${Array.isArray(v) ? JSON.stringify(v) : String(v)}`);
  }
  return new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
}

function previewable(mime: string): boolean {
  return mime.startsWith('image/') || mime === 'application/pdf';
}

function DocumentsTab({ decl, viewerRole, canEdit = false, onEdit }: { decl: any; viewerRole: string; canEdit?: boolean; onEdit?: (id: string) => void }) {
  const [previewing, setPreviewing] = React.useState<any | null>(null);
  const visibleDocs = decl.documents.filter((d: any) => !d.visibleTo || d.visibleTo.includes(viewerRole));
  const hiddenCount = decl.documents.length - visibleDocs.length;

  const handleDownload = (d: any) => {
    const blob = buildDownloadPayload(d);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.fileName.replace(/\.[^.]+$/, '')}_${d.id.slice(-6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sənəd endirilir (demo: sahələr mətnə çevrildi)');
  };

  return (
    <div className="card">
      <div className="card-body">
        {hiddenCount > 0 && (
          <div className="banner info" style={{ marginBottom: 10 }}>
            <Eye size={16} />
            <div className="b-body">
              <div className="b-title">Sizin görmə icazəniz olmayan sənədlər var</div>
              <div>{hiddenCount} sənəd rolunuza ({viewerRole}) görə gizlədilib.</div>
            </div>
          </div>
        )}
        {visibleDocs.length === 0 ? (
          <EmptyState title="Sizə görünən sənəd yoxdur" />
        ) : (
          <>
            <div className="text-muted text-sm" style={{ marginBottom: 8 }}>
              Cəmi {visibleDocs.length} sənəd · {new Set(visibleDocs.map((d: any) => d.typeCode)).size} fərqli növ
            </div>
            {(['FINANCIAL', 'LEGAL', 'CUSTOMS', 'TRANSPORT', 'CERTIFICATES'] as const).map((g) => {
              const items = visibleDocs.filter((d: any) => d.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g} style={{ marginBottom: 18 }}>
                  <h4 className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                    {DOCUMENT_GROUPS[g]} ({items.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((d: any) => {
                      const meta = DOCUMENT_TYPES.find((t) => t.code === d.typeCode);
                      return (
                        <div key={d.id} className="doc-card" style={{ alignItems: 'flex-start', padding: 12 }}>
                          <div className="doc-icon">{fileIcon(d.fileMime)}</div>
                          <div className="doc-meta" style={{ flex: 1 }}>
                            <div className="doc-name" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <b>{meta?.label ?? d.typeCode}</b>
                              <span className="text-muted">— {d.fileName}</span>
                              {d.isComplete ? (
                                <span className="badge" style={{ background: '#d1fae5', color: '#065f46' }}>Tamamlanıb</span>
                              ) : (
                                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>Yarımçıq</span>
                              )}
                              {!previewable(d.fileMime) && (
                                <span className="badge" style={{ background: '#e5e7eb', color: '#374151' }} title="Bu format üçün önbaxış mövcud deyil">
                                  Önbaxış yoxdur
                                </span>
                              )}
                            </div>
                            <div className="doc-info">
                              {d.fileMime} · {d.fileSizeKB} KB · Yükləndi: {formatDateTime(d.uploadedAt)}
                            </div>
                            {d.visibleTo && d.visibleTo.length < 5 && (
                              <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                                Görünür: {d.visibleTo.join(', ')}
                              </div>
                            )}
                            <details style={{ marginTop: 8 }}>
                              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--brand-700)' }}>
                                Sahələri göstər ({Object.keys(d.fields ?? {}).length})
                              </summary>
                              <div style={{ marginTop: 6, padding: 10, background: 'var(--n-50)', borderRadius: 6, fontSize: 12 }}>
                                {Object.entries(d.fields ?? {}).map(([k, v]) => (
                                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', gap: 12 }}>
                                    <span className="text-muted">{k}:</span>
                                    <span style={{ textAlign: 'right' }}>{Array.isArray(v) ? `${v.length} sətir` : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" title="Önbaxış"
                              onClick={() => setPreviewing(d)}
                              disabled={!previewable(d.fileMime)}>
                              <Eye size={14} /> Önbaxış
                            </button>
                            <button className="btn btn-ghost btn-sm" title="Endir" onClick={() => handleDownload(d)}>
                              <Download size={14} /> Endir
                            </button>
                            {canEdit && onEdit && (
                              <button className="btn btn-warning btn-sm" title="Düzəliş et" onClick={() => onEdit(d.id)}>
                                <Edit2 size={14} /> Düzəlt
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {previewing && (
        <Modal open={true} onClose={() => setPreviewing(null)} size="lg"
          title={`${DOCUMENT_TYPES.find((t) => t.code === previewing.typeCode)?.label ?? previewing.typeCode} — Önbaxış`}
          footer={<button className="btn btn-secondary" onClick={() => setPreviewing(null)}>Bağla</button>}>
          <div className="banner info" style={{ marginBottom: 10 }}>
            <Info size={16} />
            <div className="b-body">
              <div className="b-title">Demo mühit</div>
              <div>
                Faktiki fayl yaddaşı yoxdur — bu pəncərə sənədin metadatasını göstərir.
                İstehsal mühitində burada {previewing.fileMime.startsWith('image/') ? 'şəkil' : 'PDF'} göstəriləcək.
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--n-50)', padding: 12, borderRadius: 8, fontSize: 13 }}>
            <div><b>Fayl:</b> {previewing.fileName}</div>
            <div><b>Növ:</b> {previewing.fileMime}</div>
            <div><b>Ölçü:</b> {previewing.fileSizeKB} KB</div>
            <div><b>Yükləndi:</b> {formatDateTime(previewing.uploadedAt)}</div>
            <div style={{ marginTop: 8 }}><b>Sahələr:</b></div>
            <pre style={{ background: 'var(--n-0)', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 320 }}>
              {JSON.stringify(previewing.fields, null, 2)}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
}
