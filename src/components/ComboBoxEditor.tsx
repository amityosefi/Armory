import React, { useState, useEffect, useRef } from 'react';

const ComboBoxEditor = (props: any) => {
    const [value, setValue] = useState(props.value || '');
    const refSelect = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        setTimeout(() => {
            refSelect.current?.focus();
        }, 0);
    }, []);

    // AG Grid calls this to get the edited value
    const getValue = () => value;

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setValue(e.target.value);
    };

    // Attach this method to props so AG Grid can call it
    useEffect(() => {
        props.api.stopEditing();
    }, [value]);

    // AG Grid expects these methods on props
    React.useImperativeHandle(props.forwardRef, () => ({
        getValue,
    }));

    return (
        <select ref={refSelect} value={value} onChange={onChange} style={{ width: '100%' }}>
            {props.values?.map((val: string) => (
                <option key={val} value={val}>
                    {val}
                </option>
            ))}
        </select>
    );
};

export default ComboBoxEditor;
