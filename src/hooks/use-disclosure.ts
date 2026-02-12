import { useState, useCallback } from 'react';

/**
 * Hook per gestire lo stato di apertura/chiusura di modali, popover, dropdown, ecc.
 * @param initialState - Stato iniziale (default: false)
 * @returns Oggetto con isOpen, onOpen, onClose, onToggle
 */
export function useDisclosure(initialState: boolean = false) {
  const [isOpen, setIsOpen] = useState<boolean>(initialState);

  const onOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
  };
}




