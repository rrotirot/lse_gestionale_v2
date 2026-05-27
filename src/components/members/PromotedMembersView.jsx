import React, { useState } from "react";
import { usePromotedMembers } from '../../hooks/usePromotedMembers';
import { useMembers } from '../../hooks/useMembers';
import MemberDetailModal from './MemberDetailModal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
// Card components temporarily replaced with divs for build
import { Crown, Users, RefreshCw, Trash2 } from 'lucide-react';

const PromotedMembersView = () => {
    const { promotedMembers, loading, error, deleteMember, updateMember, refetch } = usePromotedMembers();
    const { discordBotToken } = useMembers();
    const [selectedMember, setSelectedMember] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const handleMemberClick = (member) => {
        setSelectedMember(member);
        setShowDetailModal(true);
    };

    const handleDeleteMember = async (member) => {
        if (window.confirm(`Sei sicuro di voler eliminare ${member.name} dalla lista membri promossi?`)) {
            const result = await deleteMember(member.key, ['Eliminazione manuale']);
            if (result.success) {
                alert('Membro eliminato con successo');
            } else {
                alert('Errore nell\'eliminazione: ' + result.error);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Caricamento membri promossi...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <div className="text-red-600 mb-4">Errore: {error}</div>
                <Button onClick={() => window.location.reload()}>
                    Riprova
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Crown className="h-8 w-8 text-yellow-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Membri Promossi
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Membri effettivi dell'organizzazione LSE
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="text-lg font-semibold">{promotedMembers.length}</span>
                </div>
            </div>

            {promotedMembers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center p-8">
                        <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Nessun membro promosso
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            I membri promossi appariranno qui dopo essere stati trasferiti dalla lista prospect.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {promotedMembers.map((member) => (
                        <div key={member.key} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="p-6 pb-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                        {member.tag}
                                    </Badge>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteMember(member);
                                            }}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <h3
                                    className="text-lg font-semibold hover:text-blue-600 cursor-pointer mt-2"
                                    onClick={() => handleMemberClick(member)}
                                >
                                    {member.name}
                                </h3>
                            </div>
                            <div className="px-6 pb-6">
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div>
                                        <span className="font-medium">Key:</span> {member.key}
                                    </div>
                                    <div>
                                        <span className="font-medium">Discord ID:</span>{' '}
                                        <span className="font-mono text-xs">{member.id || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium">Promosso il:</span>{' '}
                                        {member.promotedAt ? new Date(member.promotedAt).toLocaleDateString('it-IT') : '—'}
                                    </div>
                                    <div>
                                        <span className="font-medium">Da:</span> {member.promotedBy || 'Sistema'}
                                    </div>
                                    {member.promotionReason && (
                                        <div>
                                            <span className="font-medium">Motivo:</span> {member.promotionReason}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <MemberDetailModal
                member={selectedMember}
                open={showDetailModal && !!selectedMember}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setShowDetailModal(false);
                        setSelectedMember(null);
                        refetch();
                    }
                }}
                discordBotToken={discordBotToken}
                onMemberUpdate={(updatedMember) => {
                    // Se il tag/promozione cambia, aggiorna selectedMember e ricarica la lista
                    setSelectedMember(updatedMember);
                    refetch();
                }}
                deleteMemberFunction={deleteMember}
            />
        </div>
    );
};

export default PromotedMembersView;