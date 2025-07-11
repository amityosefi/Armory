import { useState, Fragment, useEffect } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

interface Option {
    rowIndex: number;
    colIndex: number;
    value: string;
}

interface StandaloneComboBoxProps {
    label: string;
    placeholder?: string;
    options: Option[];
    value: Option | null;
    onChange: (option: Option) => void;
}

export default function StandaloneComboBox({
                                               label,
                                               placeholder = '',
                                               options,
                                               value,
                                               onChange,
                                           }: StandaloneComboBoxProps) {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (value) setQuery(value.value);
    }, [value]);

    const filteredOptions =
        query === ''
            ? options
            : options.filter((opt) =>
                opt.value.toLowerCase().includes(query.toLowerCase())
            );

    return (
        <div className="w-52 text-right">
            <label className="block mb-1 font-medium">{label}</label>
            <Combobox value={value} onChange={onChange} nullable>
                <div className="relative">
                    <Combobox.Input
                        className="w-full rounded border border-gray-300 p-2 pr-10 text-right"
                        placeholder={placeholder}
                        onChange={(e) => setQuery(e.target.value)}
                        displayValue={(opt: Option | null) => opt?.value || ''}
                    />
                    <Combobox.Button className="absolute inset-y-0 left-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                            className="h-5 w-5 text-gray-400"
                            aria-hidden="true"
                        />
                    </Combobox.Button>

                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                        afterLeave={() => setQuery('')}
                    >
                        <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {filteredOptions.length === 0 ? (
                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                    לא נמצאו תוצאות
                                </div>
                            ) : (
                                filteredOptions.map((opt) => (
                                    <Combobox.Option
                                        key={`${opt.rowIndex}-${opt.colIndex}`}
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-2 pr-10 pl-4 text-right ${
                                                active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                            }`
                                        }
                                        value={opt}
                                    >
                                        {({ selected, active }) => (
                                            <>
                        <span
                            className={`block truncate ${
                                selected ? 'font-semibold' : ''
                            }`}
                        >
                          {opt.value}
                        </span>

                                                {selected ? (
                                                    <span
                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                            active ? 'text-white' : 'text-blue-600'
                                                        }`}
                                                    >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                                                ) : null}
                                            </>
                                        )}
                                    </Combobox.Option>
                                ))
                            )}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
        </div>
    );
}
