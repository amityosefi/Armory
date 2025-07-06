// RowIndexWithCheckbox.tsx
import React from 'react';

export const RowIndexWithCheckbox = (props: any) => {
    const { value, node, api } = props;

    const onCheckboxClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation(); // prevent row click
        node.setSelected(e.target.checked);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
                type="checkbox"
                checked={node.isSelected()}
                onChange={onCheckboxClick}
            />
            <span>{value}</span>
        </div>
    );
};
