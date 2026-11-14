import { Modal, Stack } from "@carbon/react";
export type ConfirmModalProps = { open:boolean; onClose:()=>void; onConfirm:()=>void; title:string; objectName:string; description?:string; danger?:boolean; confirmText?:string; cancelText?:string; loading?:boolean };
export function ConfirmModal({open,onClose,onConfirm,title,objectName,description,danger=false,confirmText="确认",cancelText="取消",loading=false}:ConfirmModalProps) {
 return <Modal open={open} modalHeading={title} primaryButtonText={confirmText} secondaryButtonText={cancelText} primaryButtonDisabled={loading} danger={danger} dangerDescription={danger ? "此操作不可撤销" : undefined} onRequestClose={onClose} onRequestSubmit={onConfirm}>
  <Stack gap={3}><p>操作对象：{objectName}</p>{description ? <p>{description}</p> : null}{danger ? <p>此操作不可撤销。</p> : null}</Stack>
 </Modal>;
}