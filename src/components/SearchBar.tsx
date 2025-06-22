import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SheetGroup } from '../types';
import GoogleSheetsService from '../services/GoogleSheetsService';
import {sheetGroups} from "../constants";
import groupNavigation from "./route/GroupNavigation";

interface SearchBarProps {
  sheetGroups: SheetGroup[];
  accessToken: string;
}

interface SearchResult {
  sheetName: string;
  cellValue: string;
  rowIndex: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ sheetGroups, accessToken }) => {
  const navigate = useNavigate();
  
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showModal, setShowModal] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    try {
      const res = await GoogleSheetsService.searchAcrossAllSheets({
        searchValue: searchText.trim(),
        accessToken,
      });
      setResults(res);
      setShowModal(true);
    } catch (error) {
      console.error("Error searching sheets:", error);
    }
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };
    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

  const handleClick = (result: SearchResult) => {
    console.log(result.sheetName);
    const sheetNameToUrl = result.sheetName.replace(/^'(.*)'$/, '$1');
    const sheetsWithIndexes = sheetGroups.flatMap((group, groupIndex) =>
      group.sheets.map((sheet, sheetIndex) => ({
        ...sheet,
        groupIndex,
        sheetIndex,
      }))
    );

    const sheetWithIndexes = sheetsWithIndexes.find(sheet => `'${sheet.range}'` === result.sheetName);
    if (sheetWithIndexes) {
      // @ts-ignore
      navigate(`/sheet/${sheetNameToUrl}/soldier/${result.rowIndex + 2}`);
      // navigate(`/sheet/${selectedSheet.range}/soldier/${event.data['rowRealIndex'] + 2}`);
      setShowModal(false);
    } else {
      console.warn(`Sheet "${result.sheetName}" not found in "${sheetsWithIndexes}".`);
    }
  };


  const handleGroupClick = (result: SearchResult) => {
    const sheetsWithIndexes = sheetGroups.flatMap((group, groupIndex) =>
        group.sheets.map((sheet, sheetIndex) => ({
          ...sheet,
          groupIndex,
          sheetIndex,
          sheetRange: sheet.range,
        }))
    );

    const sheetWithIndexes = sheetsWithIndexes.find(sheet => `'${sheet.range}'` === result.sheetName);
    if (!sheetWithIndexes) {
      console.warn(`Sheet "${result.sheetName}" not found in "${sheetsWithIndexes}".`);
      return;
    }
    if (sheetWithIndexes.groupIndex === 0)
      navigate(`/group/${sheetWithIndexes.groupIndex}/sheet/${sheetWithIndexes.sheetIndex}/row/0`);
    else
      navigate(`/group/${sheetWithIndexes.groupIndex}/sheet/${sheetWithIndexes.sheetIndex}/row/0`);
    setShowModal(false);
  }

  return (
    <>
      {/* Search Bar */}
      <div className="flex w-full gap-2">
        <input
            type="text"
            placeholder="חפש בכל הגיליונות"
            className="flex-grow px-3 py-1 border rounded-md text-right"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
        />
        <button
          onClick={handleSearch}
          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        >
          חפש
        </button>
      </div>

      {/* Search Results Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="bg-white p-6 rounded-xl border border-gray-30 shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto relative"
          >
            {/* X button inside white box */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 left-2 text-red-500 font-bold text-2xl hover:text-red-700"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4 text-right">
              תוצאות חיפוש עבור: "{searchText}"
            </h2>

            {results.length === 0 ? (
              <p className="text-center text-gray-500">לא נמצאו תוצאות.</p>
            ) : (
              <table className="min-w-[300px] table-fixed text-right border border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-3 py-2 w-1/3">גיליון</th>
                    <th className="border px-3 py-2 w-2/3">ערך</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) =>
                      <tr
                          key={idx}
                          className="border-t cursor-pointer hover:bg-gray-100"
                      >
                        <td className="border px-2 py-1 break-words w-1/3 text-blue-700 hover:underline"
                            onClick={() => handleGroupClick(result)}>
                          {result.sheetName}
                        </td>
                        <td className="border px-2 py-1 break-words w-2/3 text-blue-700 hover:underline"
                            onClick={() => handleClick(result)}>
                          {result.cellValue}
                        </td>
                      </tr>

                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;
