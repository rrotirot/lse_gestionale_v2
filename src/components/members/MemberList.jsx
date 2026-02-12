import React from 'react';
import MemberCard from './MemberCard';

export default function MemberList({ 
    members, 
    onMemberSelect, 
    discordBotToken,
}) {
    if (members.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                    Nessun membro trovato
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map(member => (
                <MemberCard
                    key={member.key}
                    member={member}
                    onSelect={onMemberSelect}
                    discordBotToken={discordBotToken}
                />
            ))}
        </div>
    );
}

