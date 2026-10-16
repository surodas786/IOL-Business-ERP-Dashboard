import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AssignDialog } from './AssignDialog';
import { HoldDialog } from './HoldDialog';
import { EquipmentDialog } from './EquipmentDialog';
import { CompletionDialog } from './CompletionDialog';
import { VerifyDialog } from './VerifyDialog';
import { MaterialRequestDialog } from './MaterialRequestDialog';
import { AcceptanceRecordDialog } from './AcceptanceRecordDialog';
import { NoteDialog } from './NoteDialog';
import type { InstallationJob } from '../../types/records';
import type { MaterialRequestKind } from '../../types/installation';

export type JobDialog = 'assign' | 'hold' | 'equipment' | 'complete' | 'verify' | 'return' | 'accept' | 'note' | {material: MaterialRequestKind;} | null;

/** Shared dialog host for the job page and the technician view. */
export function useJobDialogs(job: InstallationJob | undefined) {
  const [dialog, setDialog] = useState<JobDialog>(null);
  const close = () => setDialog(null);
  const node =
  <AnimatePresence>
      {job && dialog === 'assign' && <AssignDialog key="assign" job={job} onClose={close} />}
      {job && dialog === 'hold' && <HoldDialog key="hold" job={job} onClose={close} />}
      {job && dialog === 'equipment' && <EquipmentDialog key="eq" job={job} onClose={close} />}
      {job && dialog === 'complete' && <CompletionDialog key="done" job={job} onClose={close} />}
      {job && (dialog === 'verify' || dialog === 'return') && <VerifyDialog key={dialog} job={job} mode={dialog} onClose={close} />}
      {job && dialog === 'accept' && <AcceptanceRecordDialog key="acc" job={job} onClose={close} />}
      {job && dialog === 'note' && <NoteDialog key="note" job={job} onClose={close} />}
      {job && dialog && typeof dialog === 'object' && <MaterialRequestDialog key={dialog.material} job={job} kind={dialog.material} onClose={close} />}
    </AnimatePresence>;

  return { open: setDialog, node };
}