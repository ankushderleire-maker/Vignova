import React from 'react';
import { Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    bold: {
        fontFamily: 'Helvetica-Bold', // simplified for now, should ideally respect current font family
    },
    italic: {
        fontFamily: 'Helvetica-Oblique',
    },
    boldItalic: {
        fontFamily: 'Helvetica-BoldOblique',
    },
});

interface RichTextProps {
    text: string;
    style?: any;
}

// Simple parser for **bold** and *italic*
export const RichTextRenderer: React.FC<RichTextProps> = ({ text, style }) => {
    if (!text) return null;

    // 1. Split by bold markers (**)
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return (
        <Text style={style}>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    // Inner content
                    const content = part.slice(2, -2);
                    // Check for nested italic inside bold? (Simple regex split doesn't handle nested perfectly)
                    // For now, assume simple **bold** or *italic*, not nested.
                    return <Text key={i} style={{ fontWeight: 'bold' }}>{content}</Text>;
                    // Note: react-pdf font registration handles fontWeight if family is registered correctly. 
                    // If not, we might need manual font family switching.
                } else if (part.startsWith('*') && part.endsWith('*')) {
                    const content = part.slice(1, -1);
                    return <Text key={i} style={{ fontStyle: 'italic' }}>{content}</Text>;
                }

                // Handle italic outside bold
                const italicParts = part.split(/(\*.*?\*)/g);
                return italicParts.map((subPart, j) => {
                    if (subPart.startsWith('*') && subPart.endsWith('*')) {
                        const content = subPart.slice(1, -1);
                        return <Text key={`${i}-${j}`} style={{ fontStyle: 'italic' }}>{content}</Text>;
                    }
                    return <Text key={`${i}-${j}`}>{subPart}</Text>;
                });
            })}
        </Text>
    );
};
