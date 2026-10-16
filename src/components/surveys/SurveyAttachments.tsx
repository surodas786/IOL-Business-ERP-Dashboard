import React from 'react';
import { CameraIcon, FileTextIcon, ImageIcon, PaperclipIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { useRunAction } from '../../hooks/useRunAction';
import { AdminPanel } from '../admin/AdminPanel';
import { FilePickButton } from '../field/FilePickButton';
import { formatDhaka } from '../../utils/format';
import { userName } from '../../utils/relations';
import { canWorkSurvey } from '../../utils/surveyRules';
import type { Survey } from '../../types/records';

export function SurveyAttachments({ survey: s }: {survey: Survey;}) {
  const { user, role } = useSession();
  const runAction = useRunAction();
  const canAdd = canWorkSurvey(s, user, role) && (s.status === 'In Progress' || s.status === 'Returned');
  const list = s.attachments ?? [];
  const add = (kind: 'Photo' | 'Document') => (files: {name: string;}[]) => files.forEach((f) => runAction({ type: 'SURVEY_ADD_ATTACHMENT', surveyId: s.id, name: f.name, kind }));

  return (
    <AdminPanel
      title="Photos and documents"
      description="At least one site photo is required before review. The demo keeps file names only — nothing is uploaded."
      actions={
      canAdd &&
      <>
            <FilePickButton label="Take photo" capture accept="image/*" icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden />} onPick={add('Photo')} />
            <FilePickButton label="Add document" multiple icon={<PaperclipIcon className="h-3.5 w-3.5" aria-hidden />} onPick={add('Document')} />
          </>

      }>
      
      {list.length === 0 ?
      <p className="px-4 py-8 text-center text-[12.5px] text-slate-500">No photos or documents yet.</p> :

      <ul className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) =>
        <li key={a.id} className="flex items-center gap-3 bg-white px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500" aria-hidden>
                {a.kind === 'Photo' ? <ImageIcon className="h-4 w-4" /> : <FileTextIcon className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-slate-900">{a.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {a.kind} · {userName(a.byId)} · {formatDhaka(a.at)}
                </span>
              </span>
            </li>
        )}
        </ul>
      }
    </AdminPanel>);

}