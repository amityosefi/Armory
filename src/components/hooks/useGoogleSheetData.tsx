import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import GoogleSheetsService from '../../services/GoogleSheetsService';

interface SheetDataParams {
  accessToken: string;
  range: string;
}

interface UseGoogleSheetDataOptions extends Omit<UseQueryOptions<any, Error, any, string[]>, 'queryFn' | 'queryKey'> {
  processData?: boolean;
}

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
  const { accessToken, range, processData = true } = { ...params, ...options };
  
  return useQuery({
    queryKey: ['googleSheet', range],
    queryFn: async () => {
      const data = await GoogleSheetsService.fetchSheetData(accessToken, range);
      return processData ? GoogleSheetsService.processSheetData(data) : data;
    },
    enabled: !!accessToken && !!range,
    ...options
  });
}