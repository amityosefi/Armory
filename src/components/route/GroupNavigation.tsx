import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { SheetGroup } from '../../types';

interface GroupNavigationProps {
  sheetGroups: SheetGroup[];
}

const GroupNavigation: React.FC<GroupNavigationProps> = ({ sheetGroups }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      {/* Group Tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {sheetGroups.map((group, index) => {
          const isActive = currentPath.includes(`/group/${index}`);
          return (
            <Link
              key={index}
              to={`/group/${index}`}
              className={`px-4 py-1 rounded-lg transition-colors font-medium ${
                isActive ? 'bg-blue-700 text-white shadow-md' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {group.name}
            </Link>
          );
        })}
      </div>
    </>
  );
};

export default GroupNavigation;
