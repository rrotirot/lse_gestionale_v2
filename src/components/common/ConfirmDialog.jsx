import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function ConfirmDialog({
    open,
    onOpenChange,
    title = 'Conferma',
    description = 'Sei sicuro di voler procedere?',
    confirmText = 'Conferma',
    cancelText = 'Annulla',
    onConfirm,
    variant = 'default', // 'default', 'danger'
}) {
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onOpenChange(false);
    };

    const variantClasses = {
        default: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600',
        danger: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600',
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 text-white rounded-lg transition-colors ${variantClasses[variant]}`}
                    >
                        {confirmText}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

