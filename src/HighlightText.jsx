import React from 'react';

const HighlightText = ({ text, keyword }) => {
    if (!keyword || !text) return <>{text}</>;

    // Escape special regex characters in keyword to prevent errors
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Split text by keyword (case-insensitive)
    const parts = String(text).split(new RegExp(`(${escapedKeyword})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === keyword.toLowerCase() ? (
                    <span key={i} className="text-highlight">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
};

export default HighlightText;
