import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import GoogleSheetsService from '../../services/GoogleSheetsService';

type SheetDataParams = {
  accessToken: string;
  range: string;
  isArmory?: boolean;
};

type UseGoogleSheetDataOptions = {
  processData?: boolean;
  enabled?: boolean;
  // any other react-query options you pass
};

/**
 * React Query hook for fetching Google Sheet data
 * 
 * @param params - Parameters for fetching sheet data
 * @param options - Additional React Query options
 * @returns Query result containing sheet data
 */
export function useGoogleSheetData(
    params: SheetDataParams,
    options: UseGoogleSheetDataOptions = { processData: true }
) {
  const { accessToken, range, isArmory } = params;
  const { processData = true, ...restOptions } = options;

  return useQuery({
    queryKey: ['googleSheet', range, isArmory],
    queryFn: async () => {
      const data = await GoogleSheetsService.fetchSheetData(accessToken, range, isArmory);
      return processData ? GoogleSheetsService.processSheetData(data) : data;
    },
    enabled: !!accessToken && !!range,
    ...restOptions
  });
}
